'use client'

import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Send, Loader, Maximize2, Minimize2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatPanelProps {
  speciesName: string
  onClose?: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ChatPanel({ speciesName, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: `Hi! 👋 I'm **AquaAI**, your marine intelligence assistant.\n\nYou've identified **${speciesName}**. Ask me anything — habitat, behavior, conservation status, threats, fun facts, or anything else!`,
  }])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(p => [...p, userMsg])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(`${API_URL}/chat`, {
        species_name: speciesName, message: input, chat_history: messages,
      }, { timeout: 30000 })
      setMessages(p => [...p, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.detail || 'Failed' : 'Connection error')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const mdComponents = {
    h1: ({ children }: any) => <h1 className="text-base font-bold text-white mb-2 mt-1" style={{ fontFamily: "'Orbitron', monospace" }}>{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-sm font-bold mb-2 mt-3 pb-1" style={{ color: '#67e8f9', borderBottom: '1px solid rgba(6,182,212,0.2)' }}>{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-xs font-bold mb-1 mt-2" style={{ color: 'rgba(103,232,249,0.8)' }}>{children}</h3>,
    strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
    em: ({ children }: any) => <em className="italic" style={{ color: 'rgba(255,255,255,0.6)' }}>{children}</em>,
    ul: ({ children }: any) => <ul className="space-y-1 my-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="space-y-1 my-2">{children}</ol>,
    li: ({ children }: any) => (
      <li className="flex gap-2 items-start leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
        <span className="shrink-0 mt-1" style={{ color: '#67e8f9' }}>•</span>
        <span>{children}</span>
      </li>
    ),
    p: ({ children }: any) => <p className="leading-relaxed mb-2 last:mb-0" style={{ color: 'rgba(255,255,255,0.8)' }}>{children}</p>,
    code: ({ children }: any) => <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'rgba(6,182,212,0.15)', color: '#67e8f9' }}>{children}</code>,
    hr: () => <hr style={{ borderColor: 'rgba(6,182,212,0.15)', margin: '12px 0' }} />,
  }

  return (
    <>
      {isFullscreen && <div className="fixed inset-0 z-40" style={{ background: 'rgba(2,12,27,0.7)', backdropFilter: 'blur(4px)' }} />}

      <div className={`flex flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed right-0 top-0 bottom-0 w-full md:w-1/2 z-50 rounded-none' : 'rounded-2xl'
      }`} style={{
        background: '#020c1b',
        border: '1px solid rgba(6,182,212,0.2)',
        boxShadow: '0 0 40px rgba(6,182,212,0.08)',
        height: isFullscreen ? '100vh' : '480px',
      }}>

        {/* Header */}
        <div className="flex-none flex justify-between items-center px-5 py-3.5"
          style={{ background: 'linear-gradient(90deg,rgba(6,182,212,0.12),rgba(14,116,144,0.15))', borderBottom: '1px solid rgba(6,182,212,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
              <span className="text-sm">💬</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white" style={{ fontFamily: "'Orbitron', monospace", fontSize: '10px' }}>AQUAAI</p>
              <p className="text-xs" style={{ color: 'rgba(103,232,249,0.5)', fontSize: '10px' }}>{speciesName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full mr-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs" style={{ color: 'rgba(34,197,94,0.7)', fontSize: '10px' }}>Nova Online</span>
            </div>
            <button onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='#67e8f9'; (e.currentTarget as HTMLElement).style.background='rgba(6,182,212,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.background='transparent' }}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg transition-all"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='#f87171'; (e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.background='transparent' }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto space-y-3 ${isFullscreen ? 'p-8' : 'p-4'}`}
          style={{ background: 'rgba(2,12,27,0.6)' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 mr-2"
                  style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)', fontSize: '12px' }}>
                  🌊
                </div>
              )}
              <div className={`px-3.5 py-2.5 rounded-xl text-sm ${isFullscreen ? 'max-w-2xl' : 'max-w-[85%]'}`} style={
                msg.role === 'user'
                  ? { background: 'linear-gradient(135deg,rgba(6,182,212,0.2),rgba(14,116,144,0.25))', border: '1px solid rgba(6,182,212,0.25)', color: 'rgba(255,255,255,0.9)', borderBottomRightRadius: '4px' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderBottomLeftRadius: '4px' }
              }>
                {msg.role === 'assistant'
                  ? <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                  : <p className="leading-relaxed">{msg.content}</p>
                }
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)', fontSize: '12px' }}>🌊</div>
              <div className="px-4 py-2.5 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Loader className="w-3.5 h-3.5 animate-spin" style={{ color: '#67e8f9' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Consulting marine database...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              ⚠ {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        {messages.length === 1 && (
          <div className="flex-none px-4 pb-2 flex gap-2 overflow-x-auto" style={{ borderTop: '1px solid rgba(6,182,212,0.07)' }}>
            {['Diet & hunting', 'Conservation status', 'Fun facts', 'Threats'].map(q => (
              <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs transition-all whitespace-nowrap mt-2"
                style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.14)', color: 'rgba(103,232,249,0.55)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(6,182,212,0.14)'; (e.currentTarget as HTMLElement).style.color='#67e8f9' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(6,182,212,0.06)'; (e.currentTarget as HTMLElement).style.color='rgba(103,232,249,0.55)' }}
              >{q}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={send} className={`flex-none flex gap-2 ${isFullscreen ? 'p-6' : 'p-3'}`}
          style={{ borderTop: '1px solid rgba(6,182,212,0.1)', background: 'rgba(2,12,27,0.9)' }}>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask about habitat, behavior, conservation..."
            className={`flex-1 rounded-xl px-4 text-white placeholder-white/25 focus:outline-none transition-all ${isFullscreen ? 'py-4 text-base' : 'py-2.5 text-sm'}`}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(6,182,212,0.15)', caretColor: '#67e8f9' }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor='rgba(6,182,212,0.4)' }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor='rgba(6,182,212,0.15)' }}
            disabled={loading}
          />
          <button type="submit" disabled={!input.trim() || loading}
            className={`flex-none rounded-xl flex items-center justify-center transition-all ${isFullscreen ? 'px-6' : 'w-10'}`}
            style={{
              background: input.trim() && !loading ? 'linear-gradient(135deg,rgba(6,182,212,0.3),rgba(14,116,144,0.4))' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${input.trim() && !loading ? 'rgba(6,182,212,0.45)' : 'rgba(255,255,255,0.07)'}`,
              color: input.trim() && !loading ? '#67e8f9' : 'rgba(255,255,255,0.2)',
              boxShadow: input.trim() && !loading ? '0 0 15px rgba(6,182,212,0.2)' : 'none',
            }}>
            <Send className={isFullscreen ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
        </form>

      </div>
    </>
  )
}