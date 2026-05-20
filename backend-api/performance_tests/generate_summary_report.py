"""
性能测试汇总报告生成脚本

读取 Locust 生成的 CSV 报告，生成汇总的性能分析报告

运行方式:
    python performance_tests/generate_summary_report.py <report_dir> <timestamp>
"""

import sys
import csv
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any


def read_stats_csv(csv_path: Path) -> List[Dict[str, Any]]:
    """读取 Locust 统计 CSV 文件"""
    stats = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['Name'] != 'Aggregated':  # 跳过汇总行
                stats.append(row)
    return stats


def read_failures_csv(csv_path: Path) -> List[Dict[str, Any]]:
    """读取 Locust 失败 CSV 文件"""
    failures = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                failures.append(row)
    except FileNotFoundError:
        pass
    return failures


def analyze_performance(stats: List[Dict[str, Any]]) -> Dict[str, Any]:
    """分析性能数据"""
    total_requests = sum(int(row['Request Count']) for row in stats)
    total_failures = sum(int(row['Failure Count']) for row in stats)
    
    # 计算平均响应时间
    avg_response_times = [float(row['Average Response Time']) for row in stats if row['Average Response Time']]
    avg_response_time = sum(avg_response_times) / len(avg_response_times) if avg_response_times else 0
    
    # 计算 P95 响应时间
    p95_response_times = [float(row['95%']) for row in stats if row['95%']]
    p95_response_time = sum(p95_response_times) / len(p95_response_times) if p95_response_times else 0
    
    # 计算 P99 响应时间
    p99_response_times = [float(row['99%']) for row in stats if row['99%']]
    p99_response_time = sum(p99_response_times) / len(p99_response_times) if p99_response_times else 0
    
    # 计算 RPS
    rps_values = [float(row['Requests/s']) for row in stats if row['Requests/s']]
    total_rps = sum(rps_values)
    
    # 失败率
    failure_rate = (total_failures / total_requests * 100) if total_requests > 0 else 0
    
    return {
        'total_requests': total_requests,
        'total_failures': total_failures,
        'failure_rate': failure_rate,
        'avg_response_time': avg_response_time,
        'p95_response_time': p95_response_time,
        'p99_response_time': p99_response_time,
        'total_rps': total_rps
    }


def generate_html_report(test_results: Dict[str, Any], output_path: Path):
    """生成 HTML 汇总报告"""
    html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FastAPI 性能测试汇总报告</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #333;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #555;
            margin-top: 30px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 8px;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .metric-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .metric-card.success {{
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }}
        .metric-card.warning {{
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }}
        .metric-card.info {{
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }}
        .metric-label {{
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 5px;
        }}
        .metric-value {{
            font-size: 32px;
            font-weight: bold;
        }}
        .metric-unit {{
            font-size: 16px;
            opacity: 0.8;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
        }}
        tr:hover {{
            background-color: #f5f5f5;
        }}
        .pass {{
            color: #4CAF50;
            font-weight: bold;
        }}
        .fail {{
            color: #f44336;
            font-weight: bold;
        }}
        .warning {{
            color: #ff9800;
            font-weight: bold;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #888;
        }}
        .test-section {{
            margin: 30px 0;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 8px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 FastAPI 后端性能测试汇总报告</h1>
        <p><strong>生成时间:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        
        <h2>📊 整体性能指标</h2>
        <div class="summary">
            <div class="metric-card info">
                <div class="metric-label">总请求数</div>
                <div class="metric-value">{test_results.get('overall', {}).get('total_requests', 0):,}</div>
            </div>
            <div class="metric-card {'success' if test_results.get('overall', {}).get('failure_rate', 0) < 1 else 'warning'}">
                <div class="metric-label">失败率</div>
                <div class="metric-value">{test_results.get('overall', {}).get('failure_rate', 0):.2f}<span class="metric-unit">%</span></div>
            </div>
            <div class="metric-card {'success' if test_results.get('overall', {}).get('avg_response_time', 0) < 200 else 'warning'}">
                <div class="metric-label">平均响应时间</div>
                <div class="metric-value">{test_results.get('overall', {}).get('avg_response_time', 0):.0f}<span class="metric-unit">ms</span></div>
            </div>
            <div class="metric-card {'success' if test_results.get('overall', {}).get('p95_response_time', 0) < 200 else 'warning'}">
                <div class="metric-label">P95 响应时间</div>
                <div class="metric-value">{test_results.get('overall', {}).get('p95_response_time', 0):.0f}<span class="metric-unit">ms</span></div>
            </div>
            <div class="metric-card info">
                <div class="metric-label">P99 响应时间</div>
                <div class="metric-value">{test_results.get('overall', {}).get('p99_response_time', 0):.0f}<span class="metric-unit">ms</span></div>
            </div>
            <div class="metric-card {'success' if test_results.get('overall', {}).get('total_rps', 0) >= 1000 else 'warning'}">
                <div class="metric-label">总 QPS</div>
                <div class="metric-value">{test_results.get('overall', {}).get('total_rps', 0):.0f}</div>
            </div>
        </div>
        
        <h2>✅ 性能目标达成情况</h2>
        <table>
            <thead>
                <tr>
                    <th>指标</th>
                    <th>目标值</th>
                    <th>实际值</th>
                    <th>状态</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>API 响应时间 (P95)</td>
                    <td>&lt; 200ms</td>
                    <td>{test_results.get('overall', {}).get('p95_response_time', 0):.0f}ms</td>
                    <td class="{'pass' if test_results.get('overall', {}).get('p95_response_time', 0) < 200 else 'fail'}">
                        {'✓ 通过' if test_results.get('overall', {}).get('p95_response_time', 0) < 200 else '✗ 未通过'}
                    </td>
                </tr>
                <tr>
                    <td>并发支持 (QPS)</td>
                    <td>≥ 1000</td>
                    <td>{test_results.get('overall', {}).get('total_rps', 0):.0f}</td>
                    <td class="{'pass' if test_results.get('overall', {}).get('total_rps', 0) >= 1000 else 'fail'}">
                        {'✓ 通过' if test_results.get('overall', {}).get('total_rps', 0) >= 1000 else '✗ 未通过'}
                    </td>
                </tr>
                <tr>
                    <td>失败率</td>
                    <td>&lt; 1%</td>
                    <td>{test_results.get('overall', {}).get('failure_rate', 0):.2f}%</td>
                    <td class="{'pass' if test_results.get('overall', {}).get('failure_rate', 0) < 1 else 'fail'}">
                        {'✓ 通过' if test_results.get('overall', {}).get('failure_rate', 0) < 1 else '✗ 未通过'}
                    </td>
                </tr>
            </tbody>
        </table>
        
        <h2>📈 各测试场景详情</h2>
"""
    
    # 添加各个测试场景的详情
    for test_name, test_data in test_results.items():
        if test_name != 'overall':
            html += f"""
        <div class="test-section">
            <h3>{test_name}</h3>
            <table>
                <thead>
                    <tr>
                        <th>指标</th>
                        <th>值</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>总请求数</td>
                        <td>{test_data.get('total_requests', 0):,}</td>
                    </tr>
                    <tr>
                        <td>失败数</td>
                        <td>{test_data.get('total_failures', 0):,}</td>
                    </tr>
                    <tr>
                        <td>失败率</td>
                        <td>{test_data.get('failure_rate', 0):.2f}%</td>
                    </tr>
                    <tr>
                        <td>平均响应时间</td>
                        <td>{test_data.get('avg_response_time', 0):.0f}ms</td>
                    </tr>
                    <tr>
                        <td>P95 响应时间</td>
                        <td>{test_data.get('p95_response_time', 0):.0f}ms</td>
                    </tr>
                    <tr>
                        <td>P99 响应时间</td>
                        <td>{test_data.get('p99_response_time', 0):.0f}ms</td>
                    </tr>
                    <tr>
                        <td>QPS</td>
                        <td>{test_data.get('total_rps', 0):.0f}</td>
                    </tr>
                </tbody>
            </table>
        </div>
"""
    
    html += """
        <div class="footer">
            <p>FastAPI 后端性能测试报告 | 自动生成</p>
        </div>
    </div>
</body>
</html>
"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)


def main():
    """主函数"""
    if len(sys.argv) < 3:
        print("用法: python generate_summary_report.py <report_dir> <timestamp>")
        sys.exit(1)
    
    report_dir = Path(sys.argv[1])
    timestamp = sys.argv[2]
    
    print("=" * 60)
    print("生成性能测试汇总报告...")
    print("=" * 60)
    
    # 查找所有测试报告
    test_files = {
        '基础性能测试': f'basic_test_{timestamp}_stats.csv',
        '高并发测试': f'high_concurrency_{timestamp}_stats.csv',
        '1000 QPS 压力测试': f'stress_test_1000qps_{timestamp}_stats.csv',
        '缓存性能测试': f'cache_test_{timestamp}_stats.csv',
        '数据库查询性能测试': f'database_test_{timestamp}_stats.csv',
        '样品管理 API 测试': f'sample_api_test_{timestamp}_stats.csv',
        '统计分析 API 测试': f'statistics_api_test_{timestamp}_stats.csv',
        '稳定性测试': f'stability_test_{timestamp}_stats.csv'
    }
    
    test_results = {}
    overall_stats = {
        'total_requests': 0,
        'total_failures': 0,
        'avg_response_time': 0,
        'p95_response_time': 0,
        'p99_response_time': 0,
        'total_rps': 0
    }
    
    test_count = 0
    
    for test_name, csv_file in test_files.items():
        csv_path = report_dir / csv_file
        if csv_path.exists():
            print(f"分析 {test_name}...")
            stats = read_stats_csv(csv_path)
            analysis = analyze_performance(stats)
            test_results[test_name] = analysis
            
            # 累加到整体统计
            overall_stats['total_requests'] += analysis['total_requests']
            overall_stats['total_failures'] += analysis['total_failures']
            overall_stats['avg_response_time'] += analysis['avg_response_time']
            overall_stats['p95_response_time'] += analysis['p95_response_time']
            overall_stats['p99_response_time'] += analysis['p99_response_time']
            overall_stats['total_rps'] += analysis['total_rps']
            test_count += 1
    
    # 计算平均值
    if test_count > 0:
        overall_stats['avg_response_time'] /= test_count
        overall_stats['p95_response_time'] /= test_count
        overall_stats['p99_response_time'] /= test_count
        overall_stats['failure_rate'] = (overall_stats['total_failures'] / overall_stats['total_requests'] * 100) if overall_stats['total_requests'] > 0 else 0
    
    test_results['overall'] = overall_stats
    
    # 生成 HTML 报告
    output_path = report_dir / f'summary_report_{timestamp}.html'
    generate_html_report(test_results, output_path)
    
    print("=" * 60)
    print(f"✓ 汇总报告已生成: {output_path}")
    print("=" * 60)
    
    # 输出关键指标
    print("\n关键性能指标:")
    print(f"  总请求数: {overall_stats['total_requests']:,}")
    print(f"  失败率: {overall_stats['failure_rate']:.2f}%")
    print(f"  平均响应时间: {overall_stats['avg_response_time']:.0f}ms")
    print(f"  P95 响应时间: {overall_stats['p95_response_time']:.0f}ms")
    print(f"  P99 响应时间: {overall_stats['p99_response_time']:.0f}ms")
    print(f"  总 QPS: {overall_stats['total_rps']:.0f}")
    print()


if __name__ == "__main__":
    main()
