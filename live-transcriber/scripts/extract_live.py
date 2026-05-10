#!/usr/bin/env python3
"""
48.cn 直播信息提取脚本

从直播分享 URL 或 liveId 提取流媒体地址和直播详情。

Usage:
    python3.11 extract_live.py --url "<SHARE_URL>"
    python3.11 extract_live.py --live-id "<LIVE_ID>"
    python3.11 extract_live.py --live-id "<LIVE_ID>" --download-dir /tmp/live
"""

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path


API_URL = "https://pocketapi.48.cn/live/api/v1/live/getLiveOne"


def extract_live_id(url: str) -> str:
    """从分享 URL 中提取 liveId"""
    match = re.search(r'[?&]id=(\d+)', url)
    if match:
        return match.group(1)
    raise ValueError(f"无法从 URL 中提取 liveId: {url}")


def get_live_info(live_id: str) -> dict:
    """调用 48.cn API 获取直播详情"""
    try:
        import requests
        resp = requests.post(
            API_URL,
            json={"liveId": live_id},
            headers={"Content-Type": "application/json", "os": "android"},
            timeout=15
        )
        data = resp.json()
        if data.get("success"):
            return data["content"]
        else:
            raise RuntimeError(f"API 返回错误: {data.get('message')}")
    except ImportError:
        # fallback to curl
        result = subprocess.run(
            ["curl", "-s", "-X", "POST", API_URL,
             "-H", "Content-Type: application/json",
             "-H", "os: android",
             "-d", json.dumps({"liveId": live_id})],
            capture_output=True, text=True, timeout=15
        )
        data = json.loads(result.stdout)
        if data.get("success"):
            return data["content"]
        raise RuntimeError(f"API 返回错误: {data.get('message')}")


def download_video(m3u8_url: str, output_path: str) -> bool:
    """使用 ffmpeg 下载 m3u8 视频"""
    cmd = [
        "ffmpeg", "-i", m3u8_url,
        "-c", "copy",
        "-bsf:a", "aac_adtstoasc",
        output_path, "-y"
    ]
    print(f"Downloading video to: {output_path}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode == 0:
        print(f"Download complete: {output_path}")
        return True
    else:
        print(f"Download failed: {result.stderr[-500:]}", file=sys.stderr)
        return False


def extract_audio(video_path: str, audio_path: str) -> bool:
    """从视频中提取 16kHz 单声道 WAV 音频"""
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
        audio_path, "-y"
    ]
    print(f"Extracting audio to: {audio_path}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode == 0:
        print(f"Audio extraction complete: {audio_path}")
        return True
    else:
        print(f"Audio extraction failed: {result.stderr[-500:]}", file=sys.stderr)
        return False


def format_timestamp(ms_timestamp: str) -> str:
    """将毫秒时间戳转为可读格式"""
    try:
        ts = int(ms_timestamp) / 1000
        return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts))
    except (ValueError, TypeError):
        return str(ms_timestamp)


def print_live_info(info: dict):
    """格式化输出直播信息"""
    print("\n" + "=" * 60)
    print("直播信息")
    print("=" * 60)
    print(f"  成员:     {info.get('user', {}).get('userName', 'N/A')}")
    print(f"  标题:     {info.get('title', 'N/A')}")
    print(f"  直播ID:   {info.get('liveId', 'N/A')}")
    print(f"  用户ID:   {info.get('user', {}).get('userId', 'N/A')}")
    print(f"  开始时间: {format_timestamp(info.get('ctime', '0'))}")
    print(f"  在线人数: {info.get('onlineNum', 'N/A')}")
    print(f"  状态:     {'回放' if info.get('review') else '直播中'}")
    print(f"  m3u8:     {info.get('playStreamPath', 'N/A')}")
    print(f"  弹幕文件: {info.get('msgFilePath', 'N/A')}")
    print(f"  头像:     https://source.48.cn{info.get('user', {}).get('userAvatar', '')}")
    print(f"  封面:     https://source.48.cn{info.get('coverPath', '')}")
    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="48.cn 直播信息提取与下载")
    parser.add_argument("--url", help="直播分享 URL")
    parser.add_argument("--live-id", help="直播 ID（可替代 --url）")
    parser.add_argument("--download-dir", help="下载目录（设置后自动下载视频和提取音频）")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")

    args = parser.parse_args()

    # 获取 liveId
    if args.url:
        live_id = extract_live_id(args.url)
    elif args.live_id:
        live_id = args.live_id
    else:
        parser.error("必须提供 --url 或 --live-id")

    # 获取直播信息
    print(f"Fetching live info for ID: {live_id}")
    info = get_live_info(live_id)

    # 输出信息
    if args.json:
        print(json.dumps(info, ensure_ascii=False, indent=2))
    else:
        print_live_info(info)

    # 可选：下载视频和提取音频
    if args.download_dir:
        dl_dir = Path(args.download_dir)
        dl_dir.mkdir(parents=True, exist_ok=True)

        m3u8_url = info.get("playStreamPath")
        if not m3u8_url:
            print("ERROR: 未找到 m3u8 地址", file=sys.stderr)
            sys.exit(1)

        video_path = str(dl_dir / "live_video.mp4")
        audio_path = str(dl_dir / "audio.wav")

        if download_video(m3u8_url, video_path):
            extract_audio(video_path, audio_path)

        # 保存直播信息
        info_path = dl_dir / "live_info.json"
        with open(info_path, "w", encoding="utf-8") as f:
            json.dump(info, f, ensure_ascii=False, indent=2)
        print(f"Live info saved: {info_path}")


if __name__ == "__main__":
    main()
