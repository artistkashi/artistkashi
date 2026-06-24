import json

from user_agents import parse


def parse_user_agent(ua_string: str | None) -> str | None:
    """Parse a User-Agent string into a JSON string with device/OS/browser info.

    Returns None if the input is empty or unparseable.
    """
    if not ua_string:
        return None

    try:
        ua = parse(ua_string)
        device_type = (
            "mobile"
            if ua.is_mobile
            else "tablet"
            if ua.is_tablet
            else "pc"
            if ua.is_pc
            else "unknown"
        )
        return json.dumps(
            {
                "device": ua.device.family or "Unknown",
                "device_type": device_type,
                "os": f"{ua.os.family} {ua.os.version_string}".strip(),
                "browser": f"{ua.browser.family} {ua.browser.version_string}".strip(),
            }
        )
    except Exception:
        return None
