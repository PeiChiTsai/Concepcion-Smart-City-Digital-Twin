from geopy.geocoders import Nominatim


geocoder = Nominatim(
    user_agent="citizen-ai-reporting-assistant"
)


def geocode_location(
    location_description: str,
) -> dict[str, str | float] | None:
    print("\nSearching location:")
    print(location_description)

    location = geocoder.geocode(
        location_description,
        language="es",
    )

    if location is None:
        address_parts = [
            part.strip()
            for part in location_description.split(",")
        ]
        if len(address_parts) > 1:
            simplified_query = ", ".join(address_parts[:-1])
            print("\nRetrying with simplified location:")
            print(simplified_query)
            location = geocoder.geocode(
                simplified_query,
                language="es",
            )

    if location is None:
        print("No location found.")
        return None

    print("Location found:")
    print(location.address)

    return {
        "address": location.address,
        "latitude": location.latitude,
        "longitude": location.longitude,
    }