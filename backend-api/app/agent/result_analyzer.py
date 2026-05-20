"""
结果分析器 - 本地轻量化 AI 智能体

结果分析器负责分析实验结果数据，检测异常并生成建议。
使用规则引擎评估检测项，标记超出阈值的异常。

验证需求：需求 6.1, 6.4-6.10
"""

import time
from typing import Dict, List, Any, Optional
from datetime import datetime

from .rule_engine import RuleEngine, RuleResult
from .models import Anomaly, AnalysisReport, SeverityLevel, ReportStatus


class ResultAnalyzer:
    """
    结果分析器
    
    负责分析实验结果数据，检测异常并生成分析报告。
    
    验证需求：需求 6.1
    """
    
    def __init__(self, rules_config_path: Optional[str] = None):
        """
        初始化结果分析器
        
        Args:
            rules_config_path: 规则配置文件路径，如果为 None 则使用默认路径
        
        验证需求：需求 6.1
        """
        self.rule_engine = RuleEngine(rules_config_path)
        print(f"✓ 结果分析器初始化成功，加载了 {len(self.rule_engine.get_all_rules())} 条规则")
    
    def detect_anomalies(self, data: Dict[str, Any]) -> List[Anomaly]:
        """
        检测异常
        
        遍历所有检测项，调用规则引擎评估每个检测项，
        标记超出阈值的异常。
        
        Args:
            data: 实验结果数据，格式为 {indicator_name: value}
        
        Returns:
            List[Anomaly]: 检测到的异常列表
        
        验证需求：需求 6.4-6.6
        """
        anomalies = []
        
        # 获取所有规则
        all_rules = self.rule_engine.get_all_rules()
        
        # 遍历所有规则，评估每个检测项
        for rule in all_rules:
            # 跳过逻辑规则，因为它们是组合规则
            if rule.type == "logic":
                continue
            
            # 检查数据中是否包含该指标
            if rule.indicator not in data:
                continue
            
            # 评估规则
            result = self.rule_engine.evaluate(data, rule.id)
            
            # 如果规则未通过，创建异常记录
            if not result.passed:
                anomaly = self._create_anomaly_from_result(rule.indicator, data[rule.indicator], result)
                if anomaly:
                    anomalies.append(anomaly)
        
        return anomalies
    
    def _create_anomaly_from_result(
        self, 
        indicator: str, 
        value: Any, 
        result: RuleResult
    ) -> Optional[Anomaly]:
        """
        从规则评估结果创建异常对象
        
        Args:
            indicator: 指标名称
            value: 指标值
            result: 规则评估结果
        
        Returns:
            Anomaly: 异常对象，如果无法创建则返回 None
        """
        try:
            # 尝试将值转换为浮点数
            try:
                numeric_value = float(value)
            except (ValueError, TypeError):
                # 如果无法转换为数字，使用原始值
                numeric_value = 0.0
            
            # 从结果详情中提取阈值信息
            details = result.details
            threshold_min = details.get("threshold_min") or details.get("range_min")
            threshold_max = details.get("threshold_max") or details.get("range_max")
            severity = details.get("severity", "medium")
            suggestion = details.get("suggestion", "")
            
            # 创建异常对象
            anomaly = Anomaly(
                indicator=indicator,
                value=numeric_value,
                threshold_min=threshold_min,
                threshold_max=threshold_max,
                severity=severity,
                message=result.message,
                suggestion=suggestion
            )
            
            return anomaly
        
        except Exception as e:
            print(f"✗ 创建异常对象失败: {str(e)}")
            return None
    
    def generate_suggestions(self, anomalies: List[Anomaly]) -> List[str]:
        """
        生成建议
        
        根据异常类型生成建议，包含问题描述和解决方案。
        
        Args:
            anomalies: 异常列表
        
        Returns:
            List[str]: 建议列表
        
        验证需求：需求 6.7
        """
        suggestions = []
        
        # 按严重程度分组
        high_severity = [a for a in anomalies if a.severity == SeverityLevel.HIGH]
        medium_severity = [a for a in anomalies if a.severity == SeverityLevel.MEDIUM]
        low_severity = [a for a in anomalies if a.severity == SeverityLevel.LOW]
        
        # 生成高严重度建议
        if high_severity:
            suggestions.append("【高优先级】检测到严重异常，需要立即处理：")
            for anomaly in high_severity:
                suggestions.append(f"  - {anomaly.indicator}: {anomaly.message}")
                if anomaly.suggestion:
                    suggestions.append(f"    建议：{anomaly.suggestion}")
        
        # 生成中等严重度建议
        if medium_severity:
            suggestions.append("【中优先级】检测到中等异常，建议关注：")
            for anomaly in medium_severity:
                suggestions.append(f"  - {anomaly.indicator}: {anomaly.message}")
                if anomaly.suggestion:
                    suggestions.append(f"    建议：{anomaly.suggestion}")
        
        # 生成低严重度建议
        if low_severity:
            suggestions.append("【低优先级】检测到轻微异常，可以稍后处理：")
            for anomaly in low_severity:
                suggestions.append(f"  - {anomaly.indicator}: {anomaly.message}")
                if anomaly.suggestion:
                    suggestions.append(f"    建议：{anomaly.suggestion}")
        
        # 如果没有异常，生成正常建议
        if not anomalies:
            suggestions.append("所有检测项均在正常范围内，实验结果符合标准。")
        
        return suggestions
    
    def analyze(self, result_id: str, data: Dict[str, Any]) -> AnalysisReport:
        """
        分析实验结果
        
        调用异常检测和建议生成，生成完整的分析报告。
        包含所有检测项的状态，确保分析时间 < 500ms。
        
        Args:
            result_id: 结果 ID
            data: 实验结果数据，格式为 {indicator_name: value}
        
        Returns:
            AnalysisReport: 分析报告
        
        验证需求：需求 6.8-6.10
        """
        # 记录开始时间
        start_time = time.time()
        
        try:
            # 1. 检测异常
            anomalies = self.detect_anomalies(data)
            
            # 2. 生成建议
            suggestions = self.generate_suggestions(anomalies)
            
            # 3. 确定报告状态
            status = self._determine_status(anomalies)
            
            # 4. 生成摘要
            summary = self._generate_summary(data, anomalies)
            
            # 5. 创建分析报告
            report = AnalysisReport(
                result_id=result_id,
                status=status,
                anomalies=anomalies,
                summary="\n".join([summary] + suggestions),
                analyzed_at=datetime.now().isoformat()
            )
            
            # 记录结束时间
            end_time = time.time()
            elapsed_time = (end_time - start_time) * 1000  # 转换为毫秒
            
            # 验证性能要求：分析时间 < 500ms
            if elapsed_time < 500:
                print(f"✓ 分析完成，耗时 {elapsed_time:.2f} ms (< 500 ms)")
            else:
                print(f"⚠ 分析完成，耗时 {elapsed_time:.2f} ms (> 500 ms，超出性能要求)")
            
            return report
        
        except Exception as e:
            print(f"✗ 分析失败: {str(e)}")
            
            # 返回错误报告
            return AnalysisReport(
                result_id=result_id,
                status=ReportStatus.ERROR,
                anomalies=[],
                summary=f"分析过程中发生错误: {str(e)}",
                analyzed_at=datetime.now().isoformat()
            )
    
    def _determine_status(self, anomalies: List[Anomaly]) -> str:
        """
        确定报告状态
        
        Args:
            anomalies: 异常列表
        
        Returns:
            str: 报告状态 ("normal", "warning", "error")
        """
        if not anomalies:
            return ReportStatus.NORMAL
        
        # 检查是否有高严重度异常
        has_high_severity = any(a.severity == SeverityLevel.HIGH for a in anomalies)
        if has_high_severity:
            return ReportStatus.ERROR
        
        # 检查是否有中等严重度异常
        has_medium_severity = any(a.severity == SeverityLevel.MEDIUM for a in anomalies)
        if has_medium_severity:
            return ReportStatus.WARNING
        
        # 只有低严重度异常
        return ReportStatus.WARNING
    
    def _generate_summary(self, data: Dict[str, Any], anomalies: List[Anomaly]) -> str:
        """
        生成分析摘要
        
        Args:
            data: 实验结果数据
            anomalies: 异常列表
        
        Returns:
            str: 分析摘要
        """
        total_indicators = len(data)
        anomaly_count = len(anomalies)
        normal_count = total_indicators - anomaly_count
        
        summary = f"分析摘要：共检测 {total_indicators} 项指标，"
        summary += f"其中 {normal_count} 项正常，{anomaly_count} 项异常。"
        
        if anomaly_count > 0:
            # 统计各严重程度的异常数量
            high_count = sum(1 for a in anomalies if a.severity == SeverityLevel.HIGH)
            medium_count = sum(1 for a in anomalies if a.severity == SeverityLevel.MEDIUM)
            low_count = sum(1 for a in anomalies if a.severity == SeverityLevel.LOW)
            
            severity_parts = []
            if high_count > 0:
                severity_parts.append(f"{high_count} 项严重异常")
            if medium_count > 0:
                severity_parts.append(f"{medium_count} 项中等异常")
            if low_count > 0:
                severity_parts.append(f"{low_count} 项轻微异常")
            
            summary += f" 异常分布：{', '.join(severity_parts)}。"
        
        return summary
    
    def get_rule_engine(self) -> RuleEngine:
        """
        获取规则引擎实例
        
        Returns:
            RuleEngine: 规则引擎实例
        """
        return self.rule_engine

