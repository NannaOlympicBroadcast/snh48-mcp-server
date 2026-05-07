#!/usr/bin/env python3
"""
SNH48 Skill 测试脚本 - 验证所有 CLI 命令的基本功能
"""

import json
import subprocess
import sys
from datetime import datetime, timedelta

def run_command(cmd: list) -> tuple[int, str, str]:
    """运行命令并返回返回码、stdout、stderr"""
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=30,
    )
    return result.returncode, result.stdout, result.stderr


def test_shows_command():
    """测试 shows 子命令"""
    print("测试 shows 命令...", end=" ")
    returncode, stdout, stderr = run_command([
        "python", "-m", "snh48_mcp.skill_tools", "shows", "--gid", "1", "--days", "7"
    ])

    if returncode != 0:
        print(f"❌ 失败 (返回码: {returncode})")
        print(f"  stderr: {stderr}")
        return False

    try:
        data = json.loads(stdout)
        if not isinstance(data, list):
            print("❌ 失败 (返回值不是列表)")
            return False

        if len(data) == 0:
            print("⚠️  返回空列表（可能是真实数据）")
            return True

        # 验证至少第一条记录的结构
        record = data[0]
        required_fields = [
            "date", "time", "datetime", "title", "theme", "team",
            "venue", "ticket_status", "ticket_url", "group"
        ]
        missing = [f for f in required_fields if f not in record]
        if missing:
            print(f"❌ 失败 (缺少字段: {missing})")
            return False

        # 验证日期格式
        try:
            datetime.strptime(record["date"], "%Y-%m-%d")
        except ValueError:
            print(f"❌ 失败 (日期格式无效: {record['date']})")
            return False

        print("✅ 通过")
        return True
    except json.JSONDecodeError as e:
        print(f"❌ 失败 (JSON 解析错误: {e})")
        print(f"  stdout: {stdout[:200]}")
        return False
    except Exception as e:
        print(f"❌ 失败 (异常: {e})")
        return False


def test_plan_command():
    """测试 plan 子命令"""
    print("测试 plan 命令...", end=" ")
    returncode, stdout, stderr = run_command([
        "python", "-m", "snh48_mcp.skill_tools", "plan", "--gid", "1", "--days", "7"
    ])

    if returncode != 0:
        print(f"❌ 失败 (返回码: {returncode})")
        print(f"  stderr: {stderr}")
        return False

    try:
        data = json.loads(stdout)
        if not isinstance(data, list):
            print("❌ 失败 (返回值不是列表)")
            return False

        if len(data) == 0:
            print("⚠️  返回空列表（可能是真实数据）")
            return True

        # 验证至少第一条记录的结构
        record = data[0]
        required_fields = [
            "date", "year", "title", "clock1", "team", "detail"
        ]
        missing = [f for f in required_fields if f not in record]
        if missing:
            print(f"❌ 失败 (缺少字段: {missing})")
            return False

        print("✅ 通过")
        return True
    except json.JSONDecodeError as e:
        print(f"❌ 失败 (JSON 解析错误: {e})")
        return False
    except Exception as e:
        print(f"❌ 失败 (异常: {e})")
        return False


def test_query_command():
    """测试 query 子命令（现有功能）"""
    print("测试 query 命令...", end=" ")
    returncode, stdout, stderr = run_command([
        "python", "-m", "snh48_mcp.skill_tools", "query",
        "SELECT COUNT(*) as cnt FROM members"
    ])

    if returncode != 0:
        print(f"❌ 失败 (返回码: {returncode})")
        print(f"  stderr: {stderr}")
        return False

    try:
        data = json.loads(stdout)
        if not isinstance(data, list) or len(data) != 1:
            print("❌ 失败 (返回值格式错误)")
            return False

        if "cnt" not in data[0]:
            print("❌ 失败 (缺少 cnt 字段)")
            return False

        cnt = data[0]["cnt"]
        if not isinstance(cnt, int) or cnt <= 0:
            print(f"❌ 失败 (成员数无效: {cnt})")
            return False

        print(f"✅ 通过 (共 {cnt} 位成员)")
        return True
    except json.JSONDecodeError as e:
        print(f"❌ 失败 (JSON 解析错误: {e})")
        return False
    except Exception as e:
        print(f"❌ 失败 (异常: {e})")
        return False


def test_refresh_command():
    """测试 refresh 子命令（现有功能）"""
    print("测试 refresh 命令...", end=" ")
    returncode, stdout, stderr = run_command([
        "python", "-m", "snh48_mcp.skill_tools", "refresh"
    ])

    if returncode != 0:
        print(f"❌ 失败 (返回码: {returncode})")
        print(f"  stderr: {stderr}")
        return False

    try:
        data = json.loads(stdout)
        if not isinstance(data, dict):
            print("❌ 失败 (返回值不是字典)")
            return False

        if data.get("success") != True:
            print("❌ 失败 (success 不为 True)")
            return False

        if "member_count" not in data:
            print("❌ 失败 (缺少 member_count 字段)")
            return False

        count = data["member_count"]
        if not isinstance(count, int) or count <= 0:
            print(f"❌ 失败 (成员数无效: {count})")
            return False

        print(f"✅ 通过 (刷新了 {count} 位成员)")
        return True
    except json.JSONDecodeError as e:
        print(f"❌ 失败 (JSON 解析错误: {e})")
        return False
    except Exception as e:
        print(f"❌ 失败 (异常: {e})")
        return False


def main():
    print("\n" + "="*60)
    print("SNH48 Skill 集成测试")
    print("="*60 + "\n")

    tests = [
        ("现有功能", [test_query_command, test_refresh_command]),
        ("新增功能", [test_shows_command, test_plan_command]),
    ]

    results = []
    for category, test_funcs in tests:
        print(f"\n[{category}]")
        for test_func in test_funcs:
            results.append(test_func())

    print("\n" + "="*60)
    passed = sum(results)
    total = len(results)
    print(f"总结: {passed}/{total} 测试通过")
    print("="*60 + "\n")

    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
