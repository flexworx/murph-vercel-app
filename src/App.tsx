import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import {
  FileText,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Upload,
  Volume2,
  Loader2,
  X,
  FileUp,
  Headphones,
  Gauge,
  User,
  ChevronDown,
} from 'lucide-react'

interface DocumentState {
  name: string
  content: string
  type: string
}

interface Voice {
  id: string
  name: string
  category: string
}

type AppState = 'idle' | 'uploading' | 'processing' | 'ready' | 'playing' | 'paused' | 'error'

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [document, setDocument] = useState<DocumentState | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedVoice, setSelectedVoice] = useState<string>('21m00Tcm4TlvDq8ikWAM')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Fetch voices on mount
  useEffect(() => {
    const fetchVoices = async () => {
      setIsLoadingVoices(true)
      try {
        const response = await fetch('/api/tts/voices')
        if (response.ok) {
          const data = await response.json()
          setVoices(data)
        }
      } catch (error) {
        console.error('Failed to fetch voices:', error)
      } finally {
        setIsLoadingVoices(false)
      }
    }
    fetchVoices()
  }, [])

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results.length - 1
        const command = event.results[last][0].transcript.toLowerCase().trim()

        if (command.includes('play') || command.includes('start')) {
          handlePlay()
          toast.success('Voice command: Play')
        } else if (command.includes('pause') || command.includes('stop')) {
          handlePause()
          toast.success('Voice command: Pause')
        } else if (command.includes('faster') || command.includes('speed up')) {
          const newSpeed = Math.min(playbackSpeed + 0.25, 2)
          setPlaybackSpeed(newSpeed)
          if (audioRef.current) audioRef.current.playbackRate = newSpeed
          toast.success(`Speed: ${newSpeed}x`)
        } else if (command.includes('slower') || command.includes('slow down')) {
          const newSpeed = Math.max(playbackSpeed - 0.25, 0.5)
          setPlaybackSpeed(newSpeed)
          if (audioRef.current) audioRef.current.playbackRate = newSpeed
          toast.success(`Speed: ${newSpeed}x`)
        }
      }

      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => {
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            // Already started
          }
        }
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
    }
  }, [playbackSpeed, isListening])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAppState('uploading')
    setStatusMessage('Reading document...')
    setAudioUrl(null)

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
      })

      setDocument({ name: file.name, content: text, type: file.type })
      setAppState('ready')
      setStatusMessage('Document ready. Click Play to listen.')
      toast.success(`Loaded: ${file.name}`)
    } catch (error) {
      setAppState('error')
      setStatusMessage('Failed to read document')
      toast.error('Failed to read document')
    }
  }, [])

  const handlePlay = async () => {
    if (!document) {
      toast.error('Please upload a document first')
      return
    }

    if (audioUrl && audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
      await audioRef.current.play()
      setAppState('playing')
      setStatusMessage('Playing...')
      return
    }

    setAppState('processing')
    setStatusMessage('Converting to audio...')
    setIsConverting(true)

    try {
      const response = await fetch('/api/tts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: document.content, voiceId: selectedVoice }),
      })

      if (!response.ok) throw new Error('Failed to convert')

      const data = await response.json()
      const byteCharacters = atob(data.audio)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: data.contentType })
      const url = URL.createObjectURL(blob)

      setAudioUrl(url)
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.playbackRate = playbackSpeed
        audioRef.current.play()
        setAppState('playing')
        setStatusMessage('Playing...')
      }
    } catch (error) {
      setAppState('error')
      setStatusMessage('Failed to generate audio')
      toast.error('Failed to generate audio. Please try again.')
    } finally {
      setIsConverting(false)
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setAppState('paused')
      setStatusMessage('Paused')
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setAppState('ready')
      setProgress(0)
      setStatusMessage('Stopped')
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime
      const duration = audioRef.current.duration
      if (duration > 0) setProgress((current / duration) * 100)
    }
  }

  const handleAudioEnded = () => {
    setAppState('ready')
    setProgress(0)
    setStatusMessage('Playback complete')
  }

  const toggleVoiceCommands = () => {
    if (!recognitionRef.current) {
      toast.error('Voice commands not supported in this browser')
      return
    }

    if (!isListening) {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        toast.success("Voice commands activated. Say 'play', 'pause', 'faster', or 'slower'.")
      } catch (e) {
        toast.error('Failed to start voice recognition')
      }
    } else {
      recognitionRef.current.stop()
      setIsListening(false)
      toast.info('Voice commands deactivated')
    }
  }

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId)
    setShowVoiceDropdown(false)
    if (audioUrl) {
      setAudioUrl(null)
      toast.info('Voice changed. Click Play to hear the new voice.')
    }
  }

  const clearDocument = () => {
    setDocument(null)
    setAudioUrl(null)
    setAppState('idle')
    setProgress(0)
    setStatusMessage('')
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
  }

  const selectedVoiceName = voices.find(v => v.id === selectedVoice)?.name || 'Rachel'

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Toaster position="top-center" theme="dark" />
      
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleAudioEnded} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center glow-cyan">
              <Headphones className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-2xl">Murph</span>
          </div>
          <button
            onClick={toggleVoiceCommands}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              isListening
                ? 'border-primary text-primary bg-primary/10 animate-pulse'
                : 'border-white/20 hover:border-white/40'
            }`}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            Voice Commands
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 min-h-screen">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Hero */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold">
                Listen to Your <span className="gradient-text text-glow-cyan">Documents</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Upload any document and let Murph read it aloud with natural-sounding voice.
                Perfect for driving, exercising, or multitasking.
              </p>
            </div>

            {/* Upload/Player Area */}
            <AnimatePresence mode="wait">
              {!document ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card p-12 text-center cursor-pointer hover:bg-white/10 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 glow-cyan">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Upload Document</h3>
                  <p className="text-muted-foreground mb-4">Drag and drop or click to select</p>
                  <p className="text-sm text-muted-foreground/60">Supports TXT, MD files</p>
                </motion.div>
              ) : (
                <motion.div
                  key="document"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card p-8"
                >
                  {/* Document Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{document.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {document.content.length.toLocaleString()} characters
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearDocument}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Voice & Speed Controls */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {/* Voice Selection */}
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Voice
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                          className="w-full flex items-center justify-between px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <span>{isLoadingVoices ? 'Loading...' : selectedVoiceName}</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        {showVoiceDropdown && voices.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-white/10 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                            {voices.map((voice) => (
                              <button
                                key={voice.id}
                                onClick={() => handleVoiceChange(voice.id)}
                                className={`w-full text-left px-4 py-2 hover:bg-white/10 transition-colors ${
                                  voice.id === selectedVoice ? 'bg-primary/20 text-primary' : ''
                                }`}
                              >
                                {voice.name} ({voice.category})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Playback Speed */}
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <Gauge className="w-4 h-4" />
                        Speed: {playbackSpeed}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.25"
                        value={playbackSpeed}
                        onChange={(e) => {
                          const speed = parseFloat(e.target.value)
                          setPlaybackSpeed(speed)
                          if (audioRef.current) audioRef.current.playbackRate = speed
                        }}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground/60">
                        <span>0.5x</span>
                        <span>1x</span>
                        <span>1.5x</span>
                        <span>2x</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                      <span>{Math.round(progress)}%</span>
                      <span>{statusMessage}</span>
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={handleStop}
                      disabled={appState === 'idle' || appState === 'processing'}
                      className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Square className="w-5 h-5" />
                    </button>

                    <button
                      onClick={appState === 'playing' ? handlePause : handlePlay}
                      disabled={appState === 'processing' || appState === 'uploading'}
                      className="w-16 h-16 flex items-center justify-center rounded-full bg-primary text-primary-foreground glow-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                    >
                      {appState === 'processing' || isConverting ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : appState === 'playing' ? (
                        <Pause className="w-8 h-8" />
                      ) : (
                        <Play className="w-8 h-8 ml-1" />
                      )}
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 hover:bg-white/10 transition-colors"
                    >
                      <FileUp className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Processing Status */}
                  {(appState === 'processing' || isConverting) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 text-center"
                    >
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating audio with ElevenLabs...
                      </p>
                    </motion.div>
                  )}

                  {/* Voice Commands Hint */}
                  {isListening && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20"
                    >
                      <p className="text-sm text-center text-primary">
                        🎤 Listening: "play", "pause", "faster", "slower"
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-4 pt-8">
              <div className="glass-card p-6 text-center">
                <Volume2 className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-1">Natural Voice</h4>
                <p className="text-sm text-muted-foreground">Multiple voices powered by ElevenLabs AI</p>
              </div>
              <div className="glass-card p-6 text-center">
                <Mic className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-1">Voice Commands</h4>
                <p className="text-sm text-muted-foreground">Hands-free control with speech</p>
              </div>
              <div className="glass-card p-6 text-center">
                <Gauge className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold mb-1">Speed Control</h4>
                <p className="text-sm text-muted-foreground">Adjust playback from 0.5x to 2x</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Murph — Transform documents into spoken audio
          </p>
        </div>
      </footer>
    </div>
  )
}
