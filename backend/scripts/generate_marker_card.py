"""Generate the tracked printable PipePatch ArUco marker card source asset."""

import argparse
import base64
from pathlib import Path

import cv2

MARKER_ID = 23
MARKER_SIDE_MM = 50


def marker_card_svg() -> str:
    dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    marker = cv2.aruco.generateImageMarker(dictionary, MARKER_ID, 600)
    encoded = cv2.imencode(".png", marker)[1].tobytes()
    image_data = base64.b64encode(encoded).decode("ascii")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="140mm" height="190mm" viewBox="0 0 140 190">
  <rect width="140" height="190" fill="white"/>
  <text x="70" y="16" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" font-weight="bold">PipePatch AI calibration card</text>
  <text x="70" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="4.5">ArUco DICT_4X4_50 · marker ID {MARKER_ID}</text>
  <text x="70" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="5" font-weight="bold">PRINT AT 100% / ACTUAL SIZE</text>
  <text x="70" y="41" text-anchor="middle" font-family="Arial, sans-serif" font-size="4.5" fill="#a00000">DO NOT SCALE TO FIT</text>
  <image x="45" y="54" width="{MARKER_SIDE_MM}" height="{MARKER_SIDE_MM}" href="data:image/png;base64,{image_data}"/>
  <rect x="45" y="54" width="{MARKER_SIDE_MM}" height="{MARKER_SIDE_MM}" fill="none" stroke="black" stroke-width="0.3"/>
  <line x1="45" y1="116" x2="95" y2="116" stroke="black" stroke-width="0.6"/>
  <line x1="45" y1="112" x2="45" y2="120" stroke="black" stroke-width="0.6"/>
  <line x1="95" y1="112" x2="95" y2="120" stroke="black" stroke-width="0.6"/>
  <text x="70" y="128" text-anchor="middle" font-family="Arial, sans-serif" font-size="5">50 mm verification line</text>
  <text x="70" y="142" text-anchor="middle" font-family="Arial, sans-serif" font-size="4">Before use, measure the line and black marker square with a physical ruler.</text>
  <text x="70" y="149" text-anchor="middle" font-family="Arial, sans-serif" font-size="4">Both must be exactly 50 mm. Reprint at actual size if they are not.</text>
  <text x="70" y="163" text-anchor="middle" font-family="Arial, sans-serif" font-size="4">Place the card flat beside the pipe, in the same plane, and photograph from above.</text>
</svg>'''


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.write_text(marker_card_svg(), encoding="utf-8")


if __name__ == "__main__":
    main()
