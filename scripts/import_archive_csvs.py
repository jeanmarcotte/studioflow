#!/usr/bin/env python3
"""
import_archive_csvs.py — SIGS PhotoVault Archive Importer
Reads all drive CSVs and populates Supabase archive tables.

Usage:
    python3 import_archive_csvs.py --csv-folder ~/Desktop/archive_csvs
    python3 import_archive_csvs.py --csv-folder ~/Desktop/archive_csvs --dry-run
"""

import os
import csv
import re
import argparse
import requests
import json
from datetime import datetime
from collections import defaultdict

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

# ── Junk Detection ──────────────────────────────────────────────

JUNK_PATTERNS = [
    '2019', '2020', '2021', '2022', '2023', '2024', '2025',
    'dvd_menu', 'aftereffects', 'after effects', 'presets', 'preset',
    'video_luts', 'luts', 'lr_plugins', 'plugins', 'software',
    'pm motion', 'motion array', 'showit effects', 'photoshop_shapes',
    'photos library', 'icloud photos', 'gabbyrome', 'mariannagabbytrip',
    'gabbybarmi', 'wed', 'eng', 'backgrounds', 'photopia',
    'mograpics', 'completed 2023', 'backeduppresets', 'python',
    'marianna', 'bradfordrowley', 'paradiaseedits', 'free instagram',
    '2025 shots', 'aftereffects', 'davinci', 'resolve',
]


def is_junk(folder_name):
    name_lower = folder_name.lower().strip()
    for pattern in JUNK_PATTERNS:
        if name_lower == pattern or name_lower.startswith(pattern):
            return True
    if re.match(r'^20\d\d$', name_lower):
        return True
    return False


# ── Couple Name Parser ──────────────────────────────────────────

def parse_couple_names(folder_name):
    """Extract bride and groom names from messy folder names."""
    name = folder_name.strip()
    # Remove status words
    name = re.sub(r'[\s_-]*(active|done|final|completed|redo|project)[\s_-]*', '_', name, flags=re.IGNORECASE)
    # Remove date patterns
    name = re.sub(r'[\s_-]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s_-]*\d+[\s_-]*\d{4}', '', name, flags=re.IGNORECASE)
    # Remove WED* suffixes
    name = re.sub(r'WED(VIDEO|PHOTO|PHOTOS|VIDE|VID|RAW|IVDEO|IVIDEO|DINGS?|ALBUM|ALBUMS?|PHOTS?|DINGVIDEO|DINGPHOTOS?)[A-Z_\s-]*', '', name, flags=re.IGNORECASE)
    # Remove trailing crud
    name = re.sub(r'[\s_-]+(hr|eng|redo|t7|video|photo|project|slideshow)[\s_-]*$', '', name, flags=re.IGNORECASE)

    # Split on underscore to get names
    parts = name.split('_')
    parts = [p.strip() for p in parts if p.strip() and len(p.strip()) > 1]

    if len(parts) >= 2:
        return parts[0].capitalize(), parts[1].capitalize()
    elif len(parts) == 1:
        return parts[0].capitalize(), 'Unknown'
    else:
        return folder_name[:20], 'Unknown'


# ── Service Type Detector ───────────────────────────────────────

def detect_service_type(folder_name):
    name = folder_name.upper()

    if re.search(r'WED(VIDEO|VID|IVDEO|IVIDEO|DINGVIDEO)', name) or 'VIDEOPROJECT' in name or 'VIDPROJECT' in name:
        return 'FINAL_WEDDING_VIDEO_PROJECT', 'Final Wedding Video'
    elif re.search(r'WED(PHOTO|PHOTOS|PHOTS|DINGPHOTOS?|DINGS?\b)', name) or 'PHOTOPROJECT' in name or ('WEDDING' in name and 'VIDEO' not in name):
        return 'FINAL_WEDDING_PHOTO_PROJECT', 'Final Wedding Photos'
    elif re.search(r'(^|_)ENG(_|$)', name) or name.endswith('ENG') or name.endswith('ENG_') or 'ENGAGE' in name:
        return 'ENGAGEMENT', 'Engagement Session'
    elif re.search(r'(^|_)HR(_|$|PHOTOS|WED)', name) or name.endswith('HR'):
        return 'HIGH_RES', 'High Resolution Export'
    elif re.search(r'WEDALBUM|WEDALBU', name):
        return 'WEDDING_ALBUM', 'Wedding Album'
    elif 'UNEDITEDPHOTO' in name or 'WEDRAW' in name:
        return 'UNEDITED_WEDDING_PHOTOS', 'Unedited RAW Photos'
    elif 'RAWVIDEO' in name or 'UNEDITEDVIDEO' in name:
        return 'UNEDITED_WEDDING_VIDEO', 'Unedited RAW Video'
    elif '2023' in name or '2022' in name or '2021' in name:
        return 'LEGACY_VIDEO', 'Legacy Video'
    else:
        return 'OTHER', 'Other'


# ── Supabase API Helpers ────────────────────────────────────────

def supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }


def supabase_select(table, params=None):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    headers = supabase_headers()
    headers['Prefer'] = 'return=representation'
    resp = requests.get(url, headers=headers, params=params or {})
    resp.raise_for_status()
    return resp.json()


def supabase_insert(table, rows):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    resp = requests.post(url, headers=supabase_headers(), json=rows)
    resp.raise_for_status()
    return resp.json()


def supabase_upsert(table, rows, on_conflict='id'):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    headers = supabase_headers()
    headers['Prefer'] = f'resolution=merge-duplicates,return=representation'
    resp = requests.post(url, headers=headers, json=rows)
    resp.raise_for_status()
    return resp.json()


def supabase_update(table, match_params, data):
    url = f'{SUPABASE_URL}/rest/v1/{table}'
    headers = supabase_headers()
    params = match_params
    resp = requests.patch(url, headers=headers, params=params, json=data)
    resp.raise_for_status()
    return resp.json()


# ── Main Import Logic ───────────────────────────────────────────

def run_import(csv_folder, dry_run=False):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
        return

    csv_files = sorted([
        f for f in os.listdir(csv_folder)
        if f.endswith('.csv') and 'drive' in f.lower()
    ])

    if not csv_files:
        print(f'No drive CSV files found in {csv_folder}')
        return

    print(f'Found {len(csv_files)} CSV files to process')
    print('=' * 60)

    # Accumulators
    all_drives = []
    couple_map = {}  # (bride_lower, groom_lower) -> couple data
    all_milestones = []
    all_junk = []
    duplicate_count = 0

    for csv_file in csv_files:
        filepath = os.path.join(csv_folder, csv_file)
        print(f'\nProcessing: {csv_file}')

        rows = []
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)

        if not rows:
            print(f'  ⚠ Empty CSV, skipping')
            continue

        # A. Drive summary
        drive_number = int(rows[0].get('drive_number', 0))
        drive_name = rows[0].get('drive_name', f'Drive {drive_number}')
        total_folders = sum(1 for r in rows if r.get('type') == 'FOLDER')
        total_files = sum(1 for r in rows if r.get('type') == 'FILE')
        total_size_gb = sum(float(r.get('size_mb', 0)) for r in rows if r.get('type') == 'FILE') / 1024

        # Count non-junk unique couple folders
        couple_folders = set()
        for r in rows:
            cf = r.get('couple_folder', '').strip()
            if cf and not is_junk(cf):
                couple_folders.add(cf)
        couples_found = len(couple_folders)

        drive_data = {
            'drive_number': drive_number,
            'drive_name': drive_name,
            'total_folders': total_folders,
            'total_files': total_files,
            'total_size_gb': round(total_size_gb, 1),
            'couples_found': couples_found,
            'scanned_at': datetime.now().strftime('%Y-%m-%d'),
        }
        all_drives.append(drive_data)
        print(f'  Drive {drive_number} "{drive_name}": {total_folders} folders, {total_files} files, {total_size_gb:.1f} GB, {couples_found} couples')

        # B. Parse couple folders and junk
        # Get depth=2 rows (couple-level folders)
        depth2_rows = [r for r in rows if r.get('type') == 'FOLDER' and r.get('couple_folder', '').strip()]

        # Group by couple_folder to get unique couples per drive
        seen_couples_this_drive = set()

        for r in depth2_rows:
            folder_name = r.get('couple_folder', '').strip()
            if not folder_name:
                continue

            # Junk check
            if is_junk(folder_name):
                junk_entry = {
                    'folder_name': folder_name,
                    'drive_number': drive_number,
                    'drive_name': drive_name,
                    'relative_path': r.get('relative_path', ''),
                    'size_mb': float(r.get('couple_size_mb', 0) or 0),
                    'file_count': int(r.get('couple_file_count', 0) or 0),
                    'reason': 'auto_detected',
                }
                all_junk.append(junk_entry)
                continue

            # Skip if already seen this couple_folder on this drive
            if folder_name in seen_couples_this_drive:
                continue
            seen_couples_this_drive.add(folder_name)

            bride, groom = parse_couple_names(folder_name)
            service_type, service_label = detect_service_type(folder_name)
            size_gb = float(r.get('couple_size_mb', 0) or 0) / 1024
            file_count = int(r.get('couple_file_count', 0) or 0)

            # Couple dedup key
            key = (bride.lower(), groom.lower())

            if key in couple_map:
                # Update existing
                couple_map[key]['total_size_gb'] += size_gb
                couple_map[key]['total_file_count'] += file_count
                couple_map[key]['drive_numbers'].add(drive_number)
                duplicate_count += 1
            else:
                couple_map[key] = {
                    'bride_name': bride,
                    'groom_name': groom,
                    'drive_number': drive_number,
                    'total_size_gb': size_gb,
                    'total_file_count': file_count,
                    'drive_numbers': {drive_number},
                }

            # Milestone entry
            milestone = {
                'drive_number': drive_number,
                'folder_name': folder_name,
                'relative_path': r.get('relative_path', ''),
                'full_path': f'/Volumes/{drive_name}/{r.get("relative_path", "")}',
                'service_type': service_type,
                'service_label': service_label,
                'size_gb': round(size_gb, 2),
                'file_count': file_count,
                'status': 'Online',
                'verified': False,
                '_couple_key': key,  # temp for linking
            }
            all_milestones.append(milestone)

    # Mark redundant milestones (same couple + same service_type on different drives)
    couple_service_drives = defaultdict(set)
    for m in all_milestones:
        couple_service_drives[(m['_couple_key'], m['service_type'])].add(m['drive_number'])
    for m in all_milestones:
        drives_with_this = couple_service_drives[(m['_couple_key'], m['service_type'])]
        m['is_redundant'] = len(drives_with_this) > 1

    # ── Summary ──────────────────────────────────────────────────

    print('\n' + '=' * 60)
    print('IMPORT SUMMARY')
    print('=' * 60)
    print(f'  Drives:      {len(all_drives)}')
    print(f'  Couples:     {len(couple_map)}')
    print(f'  Milestones:  {len(all_milestones)}')
    print(f'  Junk:        {len(all_junk)}')
    print(f'  Duplicates:  {duplicate_count} (couples found on multiple drives)')
    redundant_count = sum(1 for m in all_milestones if m['is_redundant'])
    print(f'  Redundant:   {redundant_count} milestones on >1 drive')

    if dry_run:
        print('\n🔸 DRY RUN — no database writes performed')
        print('\nSample couples:')
        for i, (key, data) in enumerate(list(couple_map.items())[:10]):
            print(f'  {data["bride_name"]} & {data["groom_name"]} — {data["total_size_gb"]:.1f} GB, drives: {sorted(data["drive_numbers"])}')
        print('\nSample milestones:')
        for m in all_milestones[:10]:
            print(f'  {m["folder_name"]} → {m["service_label"]} ({m["size_gb"]:.2f} GB) drive {m["drive_number"]}')
        return

    # ── Write to Supabase ────────────────────────────────────────

    print('\nInserting drives...')
    drive_id_map = {}
    for d in all_drives:
        result = supabase_insert('archive_drives', [d])
        if result:
            drive_id_map[d['drive_number']] = result[0]['id']
            print(f'  ✓ Drive {d["drive_number"]}')

    print('\nInserting couples...')
    couple_id_map = {}
    for key, data in couple_map.items():
        row = {
            'bride_name': data['bride_name'],
            'groom_name': data['groom_name'],
            'drive_number': data['drive_number'],
            'total_size_gb': round(data['total_size_gb'], 2),
            'total_file_count': data['total_file_count'],
        }
        result = supabase_insert('archive_couples', [row])
        if result:
            couple_id_map[key] = result[0]['id']
    print(f'  ✓ {len(couple_id_map)} couples inserted')

    print('\nInserting milestones...')
    milestone_count = 0
    for m in all_milestones:
        couple_key = m.pop('_couple_key')
        couple_id = couple_id_map.get(couple_key)
        drive_id = drive_id_map.get(m['drive_number'])
        m['couple_id'] = couple_id
        m['drive_id'] = drive_id
        supabase_insert('archive_milestones', [m])
        milestone_count += 1
    print(f'  ✓ {milestone_count} milestones inserted')

    print('\nInserting junk...')
    if all_junk:
        # Batch insert junk in chunks of 50
        for i in range(0, len(all_junk), 50):
            batch = all_junk[i:i+50]
            supabase_insert('archive_junk', batch)
        print(f'  ✓ {len(all_junk)} junk entries inserted')
    else:
        print('  (no junk detected)')

    print('\n✅ Import complete!')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='SIGS PhotoVault Archive Importer')
    parser.add_argument('--csv-folder', required=True, help='Path to folder containing drive CSV files')
    parser.add_argument('--dry-run', action='store_true', help='Parse only, no DB writes')
    args = parser.parse_args()
    run_import(args.csv_folder, args.dry_run)
