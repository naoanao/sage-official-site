#!/usr/bin/env python3
"""GitHub Actions用SNS投稿スクリプト"""
import os
import sys

sys.path.insert(0, '.')

from backend.scheduler.sns_daily_scheduler import SNSDailyScheduler

def main():
    s = SNSDailyScheduler()
    s.run_cycle()
    print('✅ SNS cycle complete')

if __name__ == '__main__':
    main()
