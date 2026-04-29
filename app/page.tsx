'use client'

import { useState, useEffect } from 'react'

const LOCATIONS = [
  { name: 'Rockaway', lat: 40.9012, lon: -74.5143 },
  { name: 'Morris Plains', lat: 40.8282, lon: -74.4804 },
  { name: 'Parsippany', lat: 40.8579, lon: -74.4260 },
  { name: 'Nutley', lat: 40.8194, lon: -74.1593 },
  { name: 'Secaucus', lat: 40.7896, lon: -74.0565 },
  { name: 'Wallington', lat: 40.8532, lon: -74.1138 },
  { name: 'Dover', lat: 40.8837, lon: -74.5621 },
  { name: 'Denville', lat: 40.8918, lon: -74.4774 },
]

interface WeatherData {
  temperature: number
  windSpeed: number
  precipitation: number
  humidity: number
  condition: string
}

function getPickleballRating(weather: WeatherData): { score: number; label: string; color: string } {
  let score = 100
  
  // Wind penalty
  if (weather.windSpeed > 20) score -= 40
  else if (weather.windSpeed > 15) score -= 25
  else if (weather.windSpeed > 10) score -= 10
  
  // Precipitation penalty
  if (weather.precipitation > 0.2) score -= 50
  else if (weather.precipitation > 0) score -= 20
  
  // Temperature penalty
  if (weather.temperature < 40 || weather.temperature > 95) score -= 30
  else if (weather.temperature < 50 || weather.temperature > 85) score -= 15
  
  // Humidity penalty
  if (weather.humidity > 80) score -= 10
  
  const normalizedScore = Math.max(0, score)
  
  if (normalizedScore >= 80) return { score: normalizedScore, label: 'Perfect Dinking!', color: '#22c55e' }
  if (normalizedScore >= 60) return { score: normalizedScore, label: 'Good Conditions', color: '#84cc16' }
  if (normalizedScore >= 40) return { score: normalizedScore, label: 'Playable', color: '#eab308' }
  return { score: normalizedScore, label: 'Stay Home', color: '#ef4444' }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  // Using Open-Meteo API (free, no key needed)
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`
  )
  const data = await res.json()
  
  return {
    temperature: data.current.temperature_2m,
    windSpeed: data.current.wind_speed_10m,
    precipitation: data.current.precipitation,
    humidity: data.current.relative_humidity_2m,
    condition: getWeatherCondition(data.current.weather_code),
  }
}

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail',
  }
  return conditions[code] || 'Unknown'
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchForLocation = async (location: typeof LOCATIONS[0]) => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchWeather(location.lat, location.lon)
      setWeather(data)
    } catch (err) {
      setError('Failed to fetch weather')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForLocation(selectedLocation)
  }, [selectedLocation])

  const rating = weather ? getPickleballRating(weather) : null

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <h1 style={{
        fontSize: '3rem',
        color: 'white',
        marginBottom: '0.5rem',
        textAlign: 'center',
      }}>
        🎯 Let's Dink
      </h1>
      <p style={{
        color: 'rgba(255,255,255,0.8)',
        marginBottom: '2rem',
        fontSize: '1.2rem',
      }}>
        Pickleball Weather Conditions
      </p>

      {/* Location Selector */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        justifyContent: 'center',
        marginBottom: '2rem',
        maxWidth: '600px',
      }}>
        {LOCATIONS.map((loc) => (
          <button
            key={loc.name}
            onClick={() => setSelectedLocation(loc)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '9999px',
              border: 'none',
              background: selectedLocation.name === loc.name ? '#fbbf24' : 'rgba(255,255,255,0.2)',
              color: selectedLocation.name === loc.name ? '#000' : '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: selectedLocation.name === loc.name ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Weather Card */}
      {loading && (
        <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
      )}

      {error && (
        <div style={{ color: '#fca5a5', fontSize: '1.1rem' }}>{error}</div>
      )}

      {weather && rating && !loading && (
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}>
          {/* Rating Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            padding: '1rem',
            background: rating.color + '20',
            borderRadius: '0.75rem',
          }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: rating.color,
            }}>
              {rating.score}%
            </div>
            <div style={{
              fontSize: '1.3rem',
              fontWeight: '600',
              color: rating.color,
            }}>
              {rating.label}
            </div>
          </div>

          {/* Weather Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{Math.round(weather.temperature)}°F</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Temperature</div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{Math.round(weather.windSpeed)} mph</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Wind Speed</div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{weather.humidity}%</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Humidity</div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{weather.precipitation > 0 ? 'Yes' : 'No'}</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Rain</div>
            </div>
          </div>

          {/* Condition */}
          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            padding: '0.75rem',
            background: '#e5e7eb',
            borderRadius: '0.5rem',
            color: '#374151',
          }}>
            {weather.condition}
          </div>
        </div>
      )}

      {/* Footer */}
      <p style={{
        marginTop: '2rem',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem',
      }}>
        Data from Open-Meteo • Built for pickleball players
      </p>
    </main>
  )
}
