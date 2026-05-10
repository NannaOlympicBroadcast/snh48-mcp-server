#!/usr/bin/env python3
"""
48.cn 直播视频语音转写脚本

基于 faster-whisper 将音频文件转为带时间戳的文字。

Usage:
    python3.11 transcribe.py --input <audio.wav> --output-dir <dir> [--model base] [--language zh] [--beam-size 3] [--no-vad]
"""

import argparse
import json
import sys
import time
from pathlib import Path


def check_dependencies():
    """检查并提示安装依赖"""
    try:
        from faster_whisper import WhisperModel
        return True
    except ImportError:
        print("ERROR: faster-whisper 未安装，请执行: pip3.11 install faster-whisper", file=sys.stderr)
        return False


def transcribe(input_path: str, output_dir: str, model_name: str = "base",
               language: str = "zh", beam_size: int = 3, use_vad: bool = True):
    """执行语音转写"""
    from faster_whisper import WhisperModel

    input_file = Path(input_path)
    out_dir = Path(output_dir)

    if not input_file.exists():
        print(f"ERROR: 输入文件不存在: {input_file}", file=sys.stderr)
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)

    # 加载模型
    print(f"Loading model: {model_name} (compute_type=int8)...")
    model = WhisperModel(model_name, device="cpu", compute_type="int8")

    # 开始转写
    print(f"Starting transcription: {input_file.name}")
    print(f"  Language: {language}, Beam size: {beam_size}, VAD: {use_vad}")

    start_time = time.time()

    vad_params = dict(min_silence_duration_ms=500) if use_vad else None

    segments, info = model.transcribe(
        str(input_file),
        language=language,
        beam_size=beam_size,
        vad_filter=use_vad,
        vad_parameters=vad_params
    )

    results = []
    for seg in segments:
        results.append({
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip()
        })

    elapsed = time.time() - start_time
    total_duration = results[-1]["end"] if results else 0

    print(f"Transcription done in {elapsed:.1f}s")
    print(f"  Segments: {len(results)}, Duration: {total_duration:.1f}s")
    print(f"  Speed: {total_duration / elapsed:.1f}x realtime")

    # 保存 JSON
    json_path = out_dir / "transcript.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"Saved: {json_path}")

    # 保存纯文本
    txt_path = out_dir / "transcript.txt"
    with open(txt_path, "w", encoding="utf-8") as f:
        for r in results:
            mins = int(r["start"] // 60)
            secs = int(r["start"] % 60)
            f.write(f"[{mins:02d}:{secs:02d}] {r['text']}\n")
    print(f"Saved: {txt_path}")

    # 保存 SRT 字幕格式
    srt_path = out_dir / "transcript.srt"
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, r in enumerate(results, 1):
            start_h = int(r["start"] // 3600)
            start_m = int((r["start"] % 3600) // 60)
            start_s = int(r["start"] % 60)
            start_ms = int((r["start"] % 1) * 1000)

            end_h = int(r["end"] // 3600)
            end_m = int((r["end"] % 3600) // 60)
            end_s = int(r["end"] % 60)
            end_ms = int((r["end"] % 1) * 1000)

            f.write(f"{i}\n")
            f.write(f"{start_h:02d}:{start_m:02d}:{start_s:02d},{start_ms:03d} --> "
                    f"{end_h:02d}:{end_m:02d}:{end_s:02d},{end_ms:03d}\n")
            f.write(f"{r['text']}\n\n")
    print(f"Saved: {srt_path}")

    return results


def main():
    parser = argparse.ArgumentParser(description="48.cn 直播视频语音转写")
    parser.add_argument("--input", required=True, help="输入音频文件路径 (WAV)")
    parser.add_argument("--output-dir", required=True, help="输出目录")
    parser.add_argument("--model", default="base",
                        choices=["tiny", "base", "small", "medium", "large-v2", "large-v3"],
                        help="Whisper 模型 (默认: base)")
    parser.add_argument("--language", default="zh", help="语言代码 (默认: zh)")
    parser.add_argument("--beam-size", type=int, default=3, help="解码宽度 (默认: 3)")
    parser.add_argument("--no-vad", action="store_true", help="禁用 VAD 静音过滤")

    args = parser.parse_args()

    if not check_dependencies():
        sys.exit(1)

    transcribe(
        input_path=args.input,
        output_dir=args.output_dir,
        model_name=args.model,
        language=args.language,
        beam_size=args.beam_size,
        use_vad=not args.no_vad
    )


if __name__ == "__main__":
    main()
