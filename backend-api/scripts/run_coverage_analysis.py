#!/usr/bin/env python3
"""
测试覆盖率分析脚本

此脚本用于运行测试并生成详细的覆盖率分析报告
"""

import subprocess
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple


class CoverageAnalyzer:
    """测试覆盖率分析器"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.coverage_file = project_root / ".coverage"
        self.htmlcov_dir = project_root / "htmlcov"
        self.json_report = project_root / "coverage.json"
        
    def run_tests(self) -> bool:
        """运行所有测试并生成覆盖率报告"""
        print("=" * 80)
        print("开始运行测试...")
        print("=" * 80)
        
        cmd = [
            sys.executable, "-m", "pytest",
            "tests/",
            "--cov=app",
            "--cov-report=html",
            "--cov-report=json",
            "--cov-report=term-missing",
            "-v"
        ]
        
        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            print(result.stdout)
            if result.stderr:
                print("错误输出:", result.stderr)
            
            return result.returncode == 0
        except Exception as e:
            print(f"运行测试失败: {e}")
            return False
    
    def analyze_coverage(self) -> Dict:
        """分析覆盖率数据"""
        if not self.json_report.exists():
            print("错误: 找不到覆盖率 JSON 报告")
            return {}
        
        with open(self.json_report, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return data
    
    def calculate_module_coverage(self, coverage_data: Dict) -> List[Tuple[str, Dict]]:
        """计算各模块的覆盖率"""
        files = coverage_data.get('files', {})
        
        module_stats = []
        for file_path, file_data in files.items():
            summary = file_data.get('summary', {})
            
            total_statements = summary.get('num_statements', 0)
            covered_statements = summary.get('covered_lines', 0)
            missing_statements = summary.get('missing_lines', 0)
            
            if total_statements > 0:
                coverage_percent = (covered_statements / total_statements) * 100
            else:
                coverage_percent = 100.0
            
            module_stats.append((
                file_path,
                {
                    'total': total_statements,
                    'covered': covered_statements,
                    'missing': missing_statements,
                    'percent': coverage_percent
                }
            ))
        
        # 按覆盖率排序
        module_stats.sort(key=lambda x: x[1]['percent'])
        
        return module_stats
    
    def generate_summary_report(self, coverage_data: Dict) -> str:
        """生成摘要报告"""
        totals = coverage_data.get('totals', {})
        
        total_statements = totals.get('num_statements', 0)
        covered_statements = totals.get('covered_lines', 0)
        missing_statements = totals.get('missing_lines', 0)
        percent_covered = totals.get('percent_covered', 0)
        
        report = []
        report.append("\n" + "=" * 80)
        report.append("测试覆盖率摘要")
        report.append("=" * 80)
        report.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        report.append(f"总语句数:     {total_statements:>6}")
        report.append(f"已覆盖语句:   {covered_statements:>6}")
        report.append(f"未覆盖语句:   {missing_statements:>6}")
        report.append(f"覆盖率:       {percent_covered:>6.2f}%")
        report.append("")
        
        # 评估状态
        if percent_covered >= 80:
            status = "✅ 优秀 - 达到目标"
        elif percent_covered >= 70:
            status = "⚠️  良好 - 接近目标"
        elif percent_covered >= 50:
            status = "⚠️  一般 - 需要改进"
        else:
            status = "❌ 不足 - 需要大幅改进"
        
        report.append(f"状态: {status}")
        report.append("=" * 80)
        
        return "\n".join(report)
    
    def generate_module_report(self, module_stats: List[Tuple[str, Dict]]) -> str:
        """生成模块覆盖率报告"""
        report = []
        report.append("\n" + "=" * 80)
        report.append("模块覆盖率详情（按覆盖率从低到高排序）")
        report.append("=" * 80)
        report.append("")
        report.append(f"{'模块':<50} {'语句':<8} {'已覆盖':<8} {'未覆盖':<8} {'覆盖率':<10}")
        report.append("-" * 80)
        
        for file_path, stats in module_stats:
            # 简化文件路径
            if file_path.startswith('app/'):
                display_path = file_path
            else:
                display_path = file_path
            
            if len(display_path) > 48:
                display_path = "..." + display_path[-45:]
            
            # 状态图标
            if stats['percent'] >= 80:
                icon = "✅"
            elif stats['percent'] >= 50:
                icon = "⚠️ "
            else:
                icon = "❌"
            
            report.append(
                f"{display_path:<50} "
                f"{stats['total']:<8} "
                f"{stats['covered']:<8} "
                f"{stats['missing']:<8} "
                f"{stats['percent']:>6.2f}% {icon}"
            )
        
        report.append("=" * 80)
        
        return "\n".join(report)
    
    def identify_priority_modules(self, module_stats: List[Tuple[str, Dict]]) -> str:
        """识别需要优先测试的模块"""
        report = []
        report.append("\n" + "=" * 80)
        report.append("优先测试建议")
        report.append("=" * 80)
        report.append("")
        
        # 找出覆盖率低且代码量大的模块
        priority_modules = [
            (path, stats) for path, stats in module_stats
            if stats['percent'] < 50 and stats['total'] > 20
        ]
        
        if priority_modules:
            report.append("以下模块覆盖率低且代码量大，建议优先添加测试：")
            report.append("")
            for path, stats in priority_modules[:10]:  # 只显示前 10 个
                report.append(
                    f"  - {path:<50} "
                    f"覆盖率: {stats['percent']:>6.2f}%, "
                    f"未覆盖: {stats['missing']} 行"
                )
        else:
            report.append("✅ 所有主要模块的覆盖率都在可接受范围内")
        
        report.append("")
        report.append("=" * 80)
        
        return "\n".join(report)
    
    def run_analysis(self) -> bool:
        """运行完整的覆盖率分析"""
        # 1. 运行测试
        if not self.run_tests():
            print("\n❌ 测试运行失败，无法生成覆盖率报告")
            return False
        
        # 2. 分析覆盖率数据
        coverage_data = self.analyze_coverage()
        if not coverage_data:
            print("\n❌ 无法读取覆盖率数据")
            return False
        
        # 3. 生成报告
        print(self.generate_summary_report(coverage_data))
        
        module_stats = self.calculate_module_coverage(coverage_data)
        print(self.generate_module_report(module_stats))
        print(self.identify_priority_modules(module_stats))
        
        # 4. 提示查看详细报告
        print("\n" + "=" * 80)
        print("详细覆盖率报告已生成:")
        print(f"  - HTML 报告: {self.htmlcov_dir / 'index.html'}")
        print(f"  - JSON 报告: {self.json_report}")
        print("=" * 80)
        
        return True


def main():
    """主函数"""
    # 获取项目根目录
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # 创建分析器并运行
    analyzer = CoverageAnalyzer(project_root)
    success = analyzer.run_analysis()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
