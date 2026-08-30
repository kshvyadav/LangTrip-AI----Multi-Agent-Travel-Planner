from mcp.server.fastmcp import FastMCP
import requests
import os 
from dotenv import load_dotenv

load_dotenv()

mcp = FastMCP("Weather MCP Server")

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")


def clean_city_name(city: str) -> str:
    """Extract single primary city name from user queries."""
    if not city:
        return "Tokyo"
    clean = city.split("&")[0].split(",")[0].split(" and ")[0].split("/")[0].strip()
    return clean if clean else city.strip()


@mcp.tool()
def get_current_weather(city: str):
    city_clean = clean_city_name(city)
    
    if not OPENWEATHER_API_KEY:
        return {
            "city": city_clean,
            "status": "unavailable",
            "message": "OPENWEATHER_API_KEY not configured"
        }

    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "q": city_clean,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            },
            timeout=10
        )

        data = response.json()

        if response.status_code != 200 or "main" not in data:
            return {
                "city": city_clean,
                "status": "unavailable",
                "message": data.get("message", "City not found")
            }

        return {
            "city": data.get("name", city_clean),
            "temperature_c": data["main"].get("temp"),
            "feels_like_c": data["main"].get("feels_like"),
            "humidity": data["main"].get("humidity"),
            "condition": data["weather"][0].get("description") if data.get("weather") else "Clear",
            "wind_speed": data.get("wind", {}).get("speed")
        }
    except Exception as e:
        return {
            "city": city_clean,
            "status": "error",
            "message": str(e)
        }


@mcp.tool()
def get_forecast(city: str):
    city_clean = clean_city_name(city)

    if not OPENWEATHER_API_KEY:
        return {
            "city": city_clean,
            "forecast": []
        }

    try:
        url = "https://api.openweathermap.org/data/2.5/forecast"
        response = requests.get(
            url,
            params={
                "q": city_clean,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            },
            timeout=10
        )

        data = response.json()

        if response.status_code != 200 or "list" not in data:
            return {
                "city": city_clean,
                "forecast": []
            }

        forecast = []
        for item in data.get("list", [])[:5]:
            forecast.append(
                {
                    "datetime": item.get("dt_txt"),
                    "temperature": item.get("main", {}).get("temp"),
                    "weather": item.get("weather", [{}])[0].get("description", "Clear")
                }
            )

        return {
            "city": city_clean,
            "forecast": forecast
        }
    except Exception as e:
        return {
            "city": city_clean,
            "forecast": []
        }


if __name__ == "__main__":
    mcp.run()