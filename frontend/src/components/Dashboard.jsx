import { useState, useEffect } from 'react'

function Dashboard() {
  const [athleteData, setAthleteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/data/`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setAthleteData(data)
        } else {
          setError('Failed to fetch athlete data')
        }
      } catch (err) {
        setError('Error connecting to server')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="loading">Loading athlete data...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="dashboard">
      <h1>Athlete Dashboard</h1>
      {athleteData && (
        <div className="data-container">
          <h2>Garmin Data</h2>
          {/* Display your Garmin data here based on the structure */}
          <pre>{JSON.stringify(athleteData, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default Dashboard 