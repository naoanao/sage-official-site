import psutil
import platform
import logging
from datetime import datetime
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SystemMonitorAgent:
    """
    Sage System Monitor Agent (The "Nervous System")
    Allows Sage to perceive the host PC's physical state (CPU, RAM, Disk, Battery).
    """
    def __init__(self):
        self.os_info = f"{platform.system()} {platform.release()}"
        logger.info(f"[SystemMonitor] Initialized on {self.os_info}")

    def get_system_health(self) -> Dict[str, Any]:
        """Returns a comprehensive health report of the host PC."""
        try:
            # CPU
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # RAM
            ram = psutil.virtual_memory()
            ram_used_gb = round(ram.used / (1024**3), 2)
            ram_total_gb = round(ram.total / (1024**3), 2)
            ram_percent = ram.percent

            # Disk (C: Drive)
            disk = psutil.disk_usage('C:\\')
            disk_free_gb = round(disk.free / (1024**3), 2)
            disk_percent = disk.percent

            # Battery (if laptop)
            battery = psutil.sensors_battery()
            battery_info = "No Battery"
            if battery:
                status = "Charging" if battery.power_plugged else "Discharging"
                battery_info = f"{battery.percent}% ({status})"

            return {
                "status": "success",
                "timestamp": datetime.now().isoformat(),
                "os": self.os_info,
                "cpu": {
                    "usage_percent": cpu_percent,
                    "cores": cpu_count
                },
                "memory": {
                    "used_gb": ram_used_gb,
                    "total_gb": ram_total_gb,
                    "usage_percent": ram_percent
                },
                "disk_c": {
                    "free_gb": disk_free_gb,
                    "usage_percent": disk_percent
                },
                "battery": battery_info
            }

        except Exception as e:
            logger.error(f"[SystemMonitor] Error reading sensors: {str(e)}")
            return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    agent = SystemMonitorAgent()
    print(agent.get_system_health())
