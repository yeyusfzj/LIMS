"""
输入清洗和验证工具

提供输入数据清洗和验证功能,防止 XSS、SQL 注入等安全问题。

注意:
- FastAPI 使用 Pydantic 进行数据验证,已经提供了基本的类型安全
- SQLAlchemy 使用参数化查询,已经防止了 SQL 注入
- 本模块主要用于额外的输入清洗,特别是防止 XSS 攻击
"""

import re
import html
from typing import Optional, Any
from app.core.logging import logger


class InputSanitizer:
    """输入清洗器"""
    
    # HTML 标签正则表达式
    HTML_TAG_PATTERN = re.compile(r'<[^>]+>')
    
    # JavaScript 事件处理器正则表达式
    JS_EVENT_PATTERN = re.compile(
        r'on\w+\s*=',
        re.IGNORECASE
    )
    
    # Script 标签正则表达式
    SCRIPT_PATTERN = re.compile(
        r'<script[^>]*>.*?</script>',
        re.IGNORECASE | re.DOTALL
    )
    
    # 危险的 HTML 属性
    DANGEROUS_ATTRS = [
        'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
        'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown',
        'onkeyup', 'onkeypress', 'javascript:', 'vbscript:', 'data:'
    ]
    
    @staticmethod
    def sanitize_html(text: str, allow_basic_tags: bool = False) -> str:
        """
        清洗 HTML 内容,移除危险标签和属性
        
        Args:
            text: 要清洗的文本
            allow_basic_tags: 是否允许基本的 HTML 标签(如 <b>, <i>, <u>)
            
        Returns:
            str: 清洗后的文本
        """
        if not text:
            return text
        
        # 移除 script 标签
        text = InputSanitizer.SCRIPT_PATTERN.sub('', text)
        
        # 移除 JavaScript 事件处理器
        text = InputSanitizer.JS_EVENT_PATTERN.sub('', text)
        
        # 检查危险属性
        for attr in InputSanitizer.DANGEROUS_ATTRS:
            if attr.lower() in text.lower():
                logger.warning(f"Detected dangerous attribute in input: {attr}")
                text = re.sub(
                    f'{attr}[^>]*',
                    '',
                    text,
                    flags=re.IGNORECASE
                )
        
        # 如果不允许 HTML 标签,则移除所有标签
        if not allow_basic_tags:
            text = InputSanitizer.HTML_TAG_PATTERN.sub('', text)
        else:
            # 只允许基本的格式化标签
            allowed_tags = ['b', 'i', 'u', 'strong', 'em', 'br', 'p']
            # 移除不在白名单中的标签
            def replace_tag(match):
                tag = match.group(0)
                tag_name = re.search(r'</?(\w+)', tag)
                if tag_name and tag_name.group(1).lower() in allowed_tags:
                    return tag
                return ''
            
            text = re.sub(r'<[^>]+>', replace_tag, text)
        
        return text
    
    @staticmethod
    def escape_html(text: str) -> str:
        """
        转义 HTML 特殊字符
        
        将 <, >, &, ", ' 等字符转义为 HTML 实体
        
        Args:
            text: 要转义的文本
            
        Returns:
            str: 转义后的文本
        """
        if not text:
            return text
        
        return html.escape(text)
    
    @staticmethod
    def sanitize_string(
        text: str,
        max_length: Optional[int] = None,
        strip: bool = True,
        escape_html: bool = True
    ) -> str:
        """
        清洗字符串输入
        
        Args:
            text: 要清洗的文本
            max_length: 最大长度限制
            strip: 是否去除首尾空格
            escape_html: 是否转义 HTML 字符
            
        Returns:
            str: 清洗后的文本
        """
        if not text:
            return text
        
        # 去除首尾空格
        if strip:
            text = text.strip()
        
        # 限制长度
        if max_length and len(text) > max_length:
            text = text[:max_length]
            logger.warning(f"Input truncated to {max_length} characters")
        
        # 转义 HTML 字符
        if escape_html:
            text = InputSanitizer.escape_html(text)
        
        return text
    
    @staticmethod
    def validate_no_sql_injection(text: str) -> bool:
        """
        检查是否包含 SQL 注入特征
        
        注意: SQLAlchemy 使用参数化查询已经防止了 SQL 注入,
        这个方法主要用于额外的安全检查和日志记录。
        
        Args:
            text: 要检查的文本
            
        Returns:
            bool: 是否安全(True 表示安全)
        """
        if not text:
            return True
        
        # SQL 注入特征模式
        sql_patterns = [
            r"(\bUNION\b.*\bSELECT\b)",
            r"(\bSELECT\b.*\bFROM\b)",
            r"(\bINSERT\b.*\bINTO\b)",
            r"(\bUPDATE\b.*\bSET\b)",
            r"(\bDELETE\b.*\bFROM\b)",
            r"(\bDROP\b.*\bTABLE\b)",
            r"(\bEXEC\b|\bEXECUTE\b)",
            r"(--|\#|\/\*|\*\/)",  # SQL 注释
            r"(\bOR\b.*=.*)",
            r"(\bAND\b.*=.*)",
            r"(';|\";\s*--)",
        ]
        
        text_upper = text.upper()
        
        for pattern in sql_patterns:
            if re.search(pattern, text_upper, re.IGNORECASE):
                logger.warning(f"Potential SQL injection detected: {pattern}")
                return False
        
        return True
    
    @staticmethod
    def validate_no_xss(text: str) -> bool:
        """
        检查是否包含 XSS 攻击特征
        
        Args:
            text: 要检查的文本
            
        Returns:
            bool: 是否安全(True 表示安全)
        """
        if not text:
            return True
        
        # XSS 攻击特征
        xss_patterns = [
            r'<script[^>]*>',
            r'javascript:',
            r'onerror\s*=',
            r'onload\s*=',
            r'onclick\s*=',
            r'<iframe[^>]*>',
            r'<object[^>]*>',
            r'<embed[^>]*>',
        ]
        
        text_lower = text.lower()
        
        for pattern in xss_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.warning(f"Potential XSS attack detected: {pattern}")
                return False
        
        return True
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        清洗文件名,移除危险字符
        
        Args:
            filename: 原始文件名
            
        Returns:
            str: 清洗后的文件名
        """
        if not filename:
            return filename
        
        # 移除路径分隔符和其他危险字符
        dangerous_chars = ['/', '\\', '..', '<', '>', ':', '"', '|', '?', '*']
        
        for char in dangerous_chars:
            filename = filename.replace(char, '_')
        
        # 限制文件名长度
        max_length = 255
        if len(filename) > max_length:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            if ext:
                name = name[:max_length - len(ext) - 1]
                filename = f"{name}.{ext}"
            else:
                filename = filename[:max_length]
        
        return filename
    
    @staticmethod
    def sanitize_url(url: str) -> str:
        """
        清洗 URL,确保安全
        
        Args:
            url: 原始 URL
            
        Returns:
            str: 清洗后的 URL
        """
        if not url:
            return url
        
        # 检查协议
        allowed_protocols = ['http://', 'https://']
        url_lower = url.lower()
        
        # 如果包含危险协议,返回空字符串
        dangerous_protocols = ['javascript:', 'data:', 'vbscript:', 'file:']
        for protocol in dangerous_protocols:
            if url_lower.startswith(protocol):
                logger.warning(f"Dangerous protocol detected in URL: {protocol}")
                return ''
        
        # 如果没有协议,添加 https://
        if not any(url_lower.startswith(p) for p in allowed_protocols):
            url = 'https://' + url
        
        return url
    
    @staticmethod
    def sanitize_dict(data: dict, escape_html: bool = True) -> dict:
        """
        递归清洗字典中的所有字符串值
        
        Args:
            data: 要清洗的字典
            escape_html: 是否转义 HTML 字符
            
        Returns:
            dict: 清洗后的字典
        """
        if not isinstance(data, dict):
            return data
        
        result = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = InputSanitizer.sanitize_string(
                    value,
                    escape_html=escape_html
                )
            elif isinstance(value, dict):
                result[key] = InputSanitizer.sanitize_dict(value, escape_html)
            elif isinstance(value, list):
                result[key] = [
                    InputSanitizer.sanitize_string(item, escape_html=escape_html)
                    if isinstance(item, str)
                    else item
                    for item in value
                ]
            else:
                result[key] = value
        
        return result


# 便捷函数

def sanitize_html(text: str, allow_basic_tags: bool = False) -> str:
    """清洗 HTML 内容"""
    return InputSanitizer.sanitize_html(text, allow_basic_tags)


def escape_html(text: str) -> str:
    """转义 HTML 特殊字符"""
    return InputSanitizer.escape_html(text)


def sanitize_string(
    text: str,
    max_length: Optional[int] = None,
    strip: bool = True,
    escape_html: bool = True
) -> str:
    """清洗字符串输入"""
    return InputSanitizer.sanitize_string(text, max_length, strip, escape_html)


def validate_safe_input(text: str) -> bool:
    """验证输入是否安全(检查 SQL 注入和 XSS)"""
    return (
        InputSanitizer.validate_no_sql_injection(text) and
        InputSanitizer.validate_no_xss(text)
    )


def sanitize_filename(filename: str) -> str:
    """清洗文件名"""
    return InputSanitizer.sanitize_filename(filename)


def sanitize_url(url: str) -> str:
    """清洗 URL"""
    return InputSanitizer.sanitize_url(url)
