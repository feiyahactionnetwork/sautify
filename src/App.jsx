import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Problem from './components/Problem'
import HowItWorks from './components/HowItWorks'
import ForVenues from './components/ForVenues'
import ForArtists from './components/ForArtists'
import TechStack from './components/TechStack'
import Compliance from './components/Compliance'
import Pilot from './components/Pilot'
import About from './components/About'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-ink text-fg font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <ForVenues />
        <ForArtists />
        <TechStack />
        <Compliance />
        <Pilot />
        <About />
      </main>
      <Footer />
    </div>
  )
}
