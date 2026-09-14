'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Video,
  Upload,
  ExternalLink,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Play,
  Film,
  Sparkles,
} from 'lucide-react'
import PageLoading from '@/components/PageLoading'

interface FaqVideoItem {
  id: number
  question: string
  src?: string
}

interface FunnelContent {
  salesVideo: string
  confirmationVideo: string
  faqVideos: FaqVideoItem[]
}

const DEFAULT_CONTENT: FunnelContent = {
  salesVideo: '/videos/New_Video_1789071155558.mp4',
  confirmationVideo: '/videos/New_Video_1789071155558.mp4',
  faqVideos: [
    {
      id: 1,
      question: "What if I'm already running Google ads? Is this call worth my time?",
      src: '/videos/New_Video_1789071155558.mp4',
    },
    {
      id: 2,
      question: "What is the realistic timeframe that I'll start seeing results within?",
      src: '/videos/New_Video_1789071155558.mp4',
    },
    {
      id: 3,
      question: "How does the AI receptionist integrate with our existing phone lines & software?",
      src: '/videos/New_Video_1789071155558.mp4',
    },
    {
      id: 4,
      question: "What happens if I already have a receptionist or front-desk team?",
      src: '/videos/New_Video_1789071155558.mp4',
    },
  ],
}

export default function AdminFunnelPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<FunnelContent>(DEFAULT_CONTENT)

  // Track upload states
  const [uploadingSales, setUploadingSales] = useState(false)
  const [uploadingConfirm, setUploadingConfirm] = useState(false)
  const [uploadingFaqId, setUploadingFaqId] = useState<number | null>(null)

  const salesFileInputRef = useRef<HTMLInputElement>(null)
  const confirmFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/funnel-content')
      if (res.ok) {
        const data = await res.json()
        setContent({
          salesVideo: data.salesVideo || DEFAULT_CONTENT.salesVideo,
          confirmationVideo: data.confirmationVideo || DEFAULT_CONTENT.confirmationVideo,
          faqVideos: Array.isArray(data.faqVideos) && data.faqVideos.length > 0 ? data.faqVideos : DEFAULT_CONTENT.faqVideos,
        })
      }
    } catch (e) {
      console.error('Error loading funnel content:', e)
      toast.error('Erreur lors du chargement des données.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/funnel-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      })
      if (res.ok) {
        toast.success('Vidéos et questions du funnel enregistrées avec succès !')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la sauvegarde.')
      }
    } catch (e) {
      toast.error('Impossible de contacter le serveur.')
    } finally {
      setSaving(false)
    }
  }

  // Upload helper
  const handleUploadFile = async (
    file: File,
    onSuccess: (url: string) => void,
    setUploading: (val: boolean) => void
  ) => {
    if (!file) return
    setUploading(true)
    toast.info(`Upload de ${file.name} en cours...`)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/upload-video', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.url) {
        onSuccess(data.url)
        toast.success(`Vidéo uploadée avec succès (${data.provider === 'supabase' ? 'Cloud CDN' : 'Stockage local'}) !`)
      } else {
        toast.error(data.error || "Échec de l'upload de la vidéo.")
      }
    } catch (e) {
      toast.error("Erreur réseau pendant l'upload.")
    } finally {
      setUploading(false)
    }
  }

  // Add a new FAQ video card
  const handleAddFaq = () => {
    const nextId = content.faqVideos.length > 0 ? Math.max(...content.faqVideos.map((f) => f.id)) + 1 : 1
    setContent({
      ...content,
      faqVideos: [
        ...content.faqVideos,
        {
          id: nextId,
          question: 'Nouvelle question fréquente ?',
          src: '/videos/New_Video_1789071155558.mp4',
        },
      ],
    })
    toast.info('Nouvelle question FAQ ajoutée.')
  }

  // Remove FAQ item
  const handleRemoveFaq = (id: number) => {
    setContent({
      ...content,
      faqVideos: content.faqVideos.filter((f) => f.id !== id),
    })
    toast.info('Question FAQ supprimée.')
  }

  // Update specific FAQ
  const handleUpdateFaq = (id: number, field: 'question' | 'src', value: string) => {
    setContent({
      ...content,
      faqVideos: content.faqVideos.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    })
  }

  if (loading) {
    return <PageLoading message="Chargement des configurations vidéo..." />
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e6e2d6] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#9e4733] uppercase mb-1">
            <Film className="w-3.5 h-3.5" />
            <span>Gestion du Funnel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1a1918]">
            Vidéos & FAQ du Funnel
          </h1>
          <p className="text-sm text-[#73706b] mt-1">
            Uploadez vos vidéos ou modifiez les questions des pages d'opt-in en direct.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/opt-in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#e6e2d6] text-xs font-semibold text-[#1a1918] bg-white hover:bg-[#faf8f5] transition-colors"
          >
            Voir Page 1 (/opt-in) <ExternalLink className="w-3 h-3 text-[#73706b]" />
          </Link>
          <Link
            href="/opt-in/confirmation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#e6e2d6] text-xs font-semibold text-[#1a1918] bg-white hover:bg-[#faf8f5] transition-colors"
          >
            Voir Page 3 (/confirmation) <ExternalLink className="w-3 h-3 text-[#73706b]" />
          </Link>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1a1918] hover:bg-[#33312e] text-[#f6f4f0] font-semibold text-xs tracking-wide px-4 py-2 rounded-sm cursor-pointer shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-1.5" /> Enregistrer tout
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 1. Page 1 VSL Video */}
      <Card className="border-[#e6e2d6] shadow-xs bg-white">
        <CardHeader className="border-b border-[#f0ede6] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <CardTitle className="text-base font-bold text-[#1a1918]">
                Vidéo VSL Principale (Page 1 : /opt-in)
              </CardTitle>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100/60 text-blue-800 px-2 py-0.5 rounded-xs">
              Page d'atterrissage
            </span>
          </div>
          <CardDescription className="text-xs text-[#73706b] mt-1">
            Cette vidéo est affichée au centre de votre première page d'atterrissage.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Video Preview */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              <Label className="text-xs font-semibold text-[#1a1918]">Aperçu de la vidéo</Label>
              <div className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-inner border border-gray-200 flex items-center justify-center">
                {content.salesVideo ? (
                  <video
                    src={content.salesVideo}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Aucune vidéo sélectionnée</span>
                )}
              </div>
            </div>

            {/* Right: Upload or Link input */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-[#1a1918]">
                  URL de la vidéo ou lien direct
                </Label>
                <Input
                  value={content.salesVideo}
                  onChange={(e) => setContent({ ...content, salesVideo: e.target.value })}
                  placeholder="ex: /videos/New_Video.mp4 ou https://..."
                  className="mt-1 font-mono text-xs"
                />
                <p className="text-[11px] text-[#73706b] mt-1">
                  Vous pouvez entrer un lien direct (.mp4, .webm) ou uploader votre propre fichier ci-dessous.
                </p>
              </div>

              {/* Upload Box */}
              <div className="p-4 border-2 border-dashed border-[#e6e2d6] hover:border-[#9e4733]/50 rounded-lg bg-[#faf8f5] transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-[#e6e2d6] flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4 text-[#73706b]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1a1918]">
                      Uploader une nouvelle vidéo depuis votre ordinateur
                    </p>
                    <p className="text-[11px] text-[#73706b]">
                      Format recommandé : MP4, WEBM ou MOV (Hébergé automatiquement sur CDN Supabase)
                    </p>
                  </div>
                </div>

                <input
                  ref={salesFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleUploadFile(
                        file,
                        (url) => setContent((prev) => ({ ...prev, salesVideo: url })),
                        setUploadingSales
                      )
                    }
                  }}
                />

                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingSales}
                  onClick={() => salesFileInputRef.current?.click()}
                  className="shrink-0 text-xs font-semibold cursor-pointer border-[#e6e2d6] hover:bg-white"
                >
                  {uploadingSales ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Choisir un fichier
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Page 3 Almost Done Video */}
      <Card className="border-[#e6e2d6] shadow-xs bg-white">
        <CardHeader className="border-b border-[#f0ede6] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <CardTitle className="text-base font-bold text-[#1a1918]">
                Vidéo "Almost Done" (Page 3 : /opt-in/confirmation)
              </CardTitle>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100/60 text-emerald-800 px-2 py-0.5 rounded-xs">
              Page Confirmation
            </span>
          </div>
          <CardDescription className="text-xs text-[#73706b] mt-1">
            Vidéo principale au-dessus du bouton bleu "Confirm Meeting On Google Calendar!".
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Video Preview */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              <Label className="text-xs font-semibold text-[#1a1918]">Aperçu de la vidéo</Label>
              <div className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-inner border border-gray-200 flex items-center justify-center">
                {content.confirmationVideo ? (
                  <video
                    src={content.confirmationVideo}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Aucune vidéo sélectionnée</span>
                )}
              </div>
            </div>

            {/* Right: Upload or Link input */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-[#1a1918]">
                  URL de la vidéo
                </Label>
                <Input
                  value={content.confirmationVideo}
                  onChange={(e) => setContent({ ...content, confirmationVideo: e.target.value })}
                  placeholder="ex: /videos/AlmostDone.mp4 ou https://..."
                  className="mt-1 font-mono text-xs"
                />
              </div>

              {/* Upload Box */}
              <div className="p-4 border-2 border-dashed border-[#e6e2d6] hover:border-[#9e4733]/50 rounded-lg bg-[#faf8f5] transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-[#e6e2d6] flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4 text-[#73706b]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1a1918]">
                      Uploader la vidéo de confirmation
                    </p>
                    <p className="text-[11px] text-[#73706b]">
                      Expliquez au prospect de valider le meeting sur son Google Calendar.
                    </p>
                  </div>
                </div>

                <input
                  ref={confirmFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleUploadFile(
                        file,
                        (url) => setContent((prev) => ({ ...prev, confirmationVideo: url })),
                        setUploadingConfirm
                      )
                    }
                  }}
                />

                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingConfirm}
                  onClick={() => confirmFileInputRef.current?.click()}
                  className="shrink-0 text-xs font-semibold cursor-pointer border-[#e6e2d6] hover:bg-white"
                >
                  {uploadingConfirm ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Choisir un fichier
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. FAQ Videos & Questions */}
      <Card className="border-[#e6e2d6] shadow-xs bg-white">
        <CardHeader className="border-b border-[#f0ede6] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-700 text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <CardTitle className="text-base font-bold text-[#1a1918]">
                  Vidéos & Questions FAQ (Grille 2 colonnes sur /opt-in/confirmation)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-[#73706b] mt-1">
                Modifiez le titre des questions posées et associez la vidéo correspondante pour chaque question.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddFaq}
              className="text-xs font-semibold border-[#e6e2d6] hover:bg-[#faf8f5] cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter une question FAQ
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.faqVideos.map((faq, index) => {
              const fileRef = `faq-input-${faq.id}`
              const isUploadingThis = uploadingFaqId === faq.id

              return (
                <div
                  key={faq.id}
                  className="p-4 rounded-xl border border-[#e6e2d6] bg-[#faf8f5]/60 hover:bg-[#faf8f5] transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Header: Question Number + Delete Button */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#9e4733] bg-orange-50 px-2 py-0.5 rounded-sm border border-orange-100">
                        Question #{index + 1}
                      </span>
                      {content.faqVideos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(faq.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                          title="Supprimer cette question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Question Title Input */}
                    <div>
                      <Label className="text-xs font-bold text-[#1a1918]">
                        Titre de la question
                      </Label>
                      <Input
                        value={faq.question}
                        onChange={(e) => handleUpdateFaq(faq.id, 'question', e.target.value)}
                        placeholder="ex: Quel est le délai pour obtenir des résultats ?"
                        className="mt-1 bg-white text-xs font-medium"
                      />
                    </div>

                    {/* Video Preview */}
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black border border-gray-200">
                      {faq.src ? (
                        <video src={faq.src} controls className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                          Pas de vidéo
                        </div>
                      )}
                    </div>

                    {/* Video URL Input */}
                    <div>
                      <Label className="text-[11px] font-semibold text-[#73706b]">
                        Lien de la vidéo FAQ
                      </Label>
                      <Input
                        value={faq.src || ''}
                        onChange={(e) => handleUpdateFaq(faq.id, 'src', e.target.value)}
                        placeholder="URL de la vidéo..."
                        className="mt-0.5 bg-white font-mono text-[11px] h-8"
                      />
                    </div>
                  </div>

                  {/* Upload button for this FAQ video */}
                  <div className="pt-2 border-t border-[#e6e2d6]/80 flex items-center justify-between">
                    <input
                      id={fileRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleUploadFile(
                            file,
                            (url) => handleUpdateFaq(faq.id, 'src', url),
                            (val) => setUploadingFaqId(val ? faq.id : null)
                          )
                        }
                      }}
                    />

                    <span className="text-[11px] text-[#73706b]">Changer le fichier vidéo :</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isUploadingThis}
                      onClick={() => document.getElementById(fileRef)?.click()}
                      className="text-xs h-7 px-2.5 bg-white cursor-pointer border-[#e6e2d6] hover:bg-gray-50"
                    >
                      {isUploadingThis ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Upload...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3 mr-1" /> Uploader
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white/95 backdrop-blur-md border-t border-[#e6e2d6] p-4 flex items-center justify-between px-6 z-30 shadow-lg">
        <div className="flex items-center gap-2 text-xs text-[#73706b]">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Toutes vos modifications sont publiées instantanément sur vos pages d'opt-in.</span>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1a1918] hover:bg-[#33312e] text-[#f6f4f0] font-semibold text-xs tracking-wide px-5 py-2.5 rounded-sm cursor-pointer shadow-sm"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> Enregistrer les modifications
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
