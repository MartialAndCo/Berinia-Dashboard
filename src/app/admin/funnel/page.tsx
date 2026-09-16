'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
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
  BarChart3,
  TrendingUp,
  Flame,
  Split,
  Eye,
  Clock,
  Award,
  ArrowRight,
  ShieldCheck,
  MousePointerClick,
  Check,
} from 'lucide-react'
import PageLoading from '@/components/PageLoading'

const VslRetentionChart = dynamic(() => import('@/components/charts/VslRetentionChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center text-[#73706b] text-xs animate-pulse">
      Chargement de la courbe de rétention...
    </div>
  ),
})

interface FaqVideoItem {
  id: number
  question: string
  src?: string
}

interface FunnelContent {
  salesVideo: string
  salesVideoA?: string
  salesVideoB?: string
  abTestingEnabled?: boolean
  splitRatio?: number
  variantAName?: string
  variantBName?: string
  confirmationVideo: string
  faqVideos: FaqVideoItem[]
}

const DEFAULT_CONTENT: FunnelContent = {
  salesVideo: '/videos/New_Video_1789071155558.mp4',
  salesVideoA: '/videos/New_Video_1789071155558.mp4',
  salesVideoB: '/videos/New_Video_1789071155558.mp4',
  abTestingEnabled: false,
  splitRatio: 50,
  variantAName: 'Variante A (Hook Promesse ROI)',
  variantBName: 'Variante B (Hook Douleur Métier)',
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'config'>('analytics')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState<FunnelContent>(DEFAULT_CONTENT)

  // Analytics state
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)

  // Track upload states
  const [uploadingSalesA, setUploadingSalesA] = useState(false)
  const [uploadingSalesB, setUploadingSalesB] = useState(false)
  const [uploadingConfirm, setUploadingConfirm] = useState(false)
  const [uploadingFaqId, setUploadingFaqId] = useState<number | null>(null)

  const salesAFileInputRef = useRef<HTMLInputElement>(null)
  const salesBFileInputRef = useRef<HTMLInputElement>(null)
  const confirmFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadContent()
    loadAnalytics()
  }, [])

  const loadContent = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/funnel-content')
      if (res.ok) {
        const data = await res.json()
        const salesBase = data.salesVideo || DEFAULT_CONTENT.salesVideo
        setContent({
          salesVideo: salesBase,
          salesVideoA: data.salesVideoA || salesBase,
          salesVideoB: data.salesVideoB || salesBase,
          abTestingEnabled: Boolean(data.abTestingEnabled),
          splitRatio: typeof data.splitRatio === 'number' ? data.splitRatio : 50,
          variantAName: data.variantAName || DEFAULT_CONTENT.variantAName,
          variantBName: data.variantBName || DEFAULT_CONTENT.variantBName,
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

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const res = await fetch('/api/vsl/telemetry')
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data)
      }
    } catch (e) {
      console.error('Error loading telemetry:', e)
    } finally {
      setAnalyticsLoading(false)
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
        toast.success('Configurations et vidéos du funnel enregistrées avec succès !')
        loadAnalytics()
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
    return <PageLoading message="Chargement du tableau de bord VSL..." />
  }

  const mA = analyticsData?.metricsA || {
    totalSessions: 0,
    totalPlays: 0,
    playRate: 0,
    hook3sRate: 0,
    hook10sRate: 0,
    hook30sRate: 0,
    hook45sRate: 0,
    midpointRate: 0,
    completionRate: 0,
    avgWatchSeconds: 0,
    avgWatchPercent: 0,
    ctaClicks: 0,
    ctaClickRate: 0,
  }

  const mB = analyticsData?.metricsB || {
    totalSessions: 0,
    totalPlays: 0,
    playRate: 0,
    hook3sRate: 0,
    hook10sRate: 0,
    hook30sRate: 0,
    hook45sRate: 0,
    midpointRate: 0,
    completionRate: 0,
    avgWatchSeconds: 0,
    avgWatchPercent: 0,
    ctaClicks: 0,
    ctaClickRate: 0,
  }

  const stats = analyticsData?.stats || { confidence: 50, winner: 'tie' }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e6e2d6] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#9e4733] uppercase mb-1">
            <Flame className="w-3.5 h-3.5" />
            <span>Conversion Rate Optimization</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1a1918]">
            VSL Analytics & A/B Testing
          </h1>
          <p className="text-sm text-[#73706b] mt-1">
            Pilotez scientifiquement le taux de rétention du hook, la courbe de drop-off et vos variantes de VSL.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalytics}
            disabled={analyticsLoading}
            className="text-xs h-9 border-[#e6e2d6] bg-white hover:bg-gray-50 text-[#1a1918]"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${analyticsLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Link
            href="/opt-in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-[#e6e2d6] text-xs font-semibold text-[#1a1918] bg-white hover:bg-[#faf8f5] transition-colors"
          >
            Tester Landing Page <ExternalLink className="w-3 h-3 text-[#73706b]" />
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

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#e6e2d6] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-[#1a1918] text-white shadow-sm'
              : 'text-[#73706b] hover:text-[#1a1918] hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics & Performance VSL</span>
          {content.abTestingEnabled && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-bold animate-pulse">
              A/B Actif
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'bg-[#1a1918] text-white shadow-sm'
              : 'text-[#73706b] hover:text-[#1a1918] hover:bg-gray-100'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Configuration Vidéos & FAQ</span>
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-8">
          {/* A/B Test Controller Card */}
          <Card className="border-[#e6e2d6] bg-white shadow-xs">
            <CardHeader className="border-b border-[#f0ede6] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                    <Split className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-[#1a1918]">
                      Moteur d'A/B Testing VSL
                    </CardTitle>
                    <CardDescription className="text-xs text-[#73706b]">
                      Répartissez le trafic entre deux versions de VSL (testez 2 accroches / hooks différents).
                    </CardDescription>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center gap-3 bg-[#faf8f5] p-2 px-3 rounded-lg border border-[#e6e2d6]">
                  <Label htmlFor="ab-toggle" className="text-xs font-bold text-[#1a1918] cursor-pointer">
                    A/B Testing : {content.abTestingEnabled ? 'ACTIVÉ (50/50)' : 'DÉSACTIVÉ (100% VSL A)'}
                  </Label>
                  <input
                    id="ab-toggle"
                    type="checkbox"
                    checked={content.abTestingEnabled || false}
                    onChange={(e) => setContent({ ...content, abTestingEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Variant A Input */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" /> Variante A (Contrôle)
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      50% du trafic
                    </span>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-[#1a1918]">Nom / Description de l'accroche</Label>
                    <Input
                      value={content.variantAName || ''}
                      onChange={(e) => setContent({ ...content, variantAName: e.target.value })}
                      placeholder="ex: Hook Direct ROI (100% appels répondus)"
                      className="mt-1 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-[#73706b]">URL de la vidéo A</Label>
                    <Input
                      value={content.salesVideoA || content.salesVideo}
                      onChange={(e) => setContent({ ...content, salesVideoA: e.target.value, salesVideo: e.target.value })}
                      placeholder="/videos/vsl_a.mp4"
                      className="mt-1 bg-white text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Variant B Input */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" /> Variante B (Challenger)
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      50% du trafic
                    </span>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-[#1a1918]">Nom / Description de l'accroche</Label>
                    <Input
                      value={content.variantBName || ''}
                      onChange={(e) => setContent({ ...content, variantBName: e.target.value })}
                      placeholder="ex: Hook Douleur Chantier (Téléphone qui vibre)"
                      className="mt-1 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-[#73706b]">URL de la vidéo B</Label>
                    <Input
                      value={content.salesVideoB || ''}
                      onChange={(e) => setContent({ ...content, salesVideoB: e.target.value })}
                      placeholder="/videos/vsl_b.mp4"
                      className="mt-1 bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {stats.winner !== 'tie' && stats.confidence >= 85 && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900">
                        Vainqueur Statistique Détecté : {stats.winner === 'B' ? content.variantBName : content.variantAName}
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Indice de confiance calculé (Z-Test) : <b>{stats.confidence}%</b> de certitude que cette variante génère plus de prises de RDV.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Metrics Comparison Table */}
          <Card className="border-[#e6e2d6] bg-white shadow-xs">
            <CardHeader className="border-b border-[#f0ede6] pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-[#1a1918]">
                    Comparatif des Performances (Face-à-Face)
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">
                    Analyse détaillée du Hook, des checkpoints de rétention et de la conversion au clic CTA.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-[#73706b]">Total Sessions Enregistrées :</span>
                  <p className="text-lg font-bold text-[#1a1918]">{analyticsData?.totalSessions || 0}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf8f5] text-[#73706b] border-b border-[#e6e2d6] font-semibold">
                    <tr>
                      <th className="p-4">Métrique VSL</th>
                      <th className="p-4 text-blue-700 font-bold">{content.variantAName || 'Variante A'}</th>
                      {content.abTestingEnabled && (
                        <th className="p-4 text-emerald-700 font-bold">{content.variantBName || 'Variante B'}</th>
                      )}
                      {content.abTestingEnabled && <th className="p-4 text-right">Écart / Delta</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede6] text-[#1a1918]">
                    <tr>
                      <td className="p-4 font-medium flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                        Visiteurs arrivés sur la page
                      </td>
                      <td className="p-4 font-semibold">{mA.totalSessions}</td>
                      {content.abTestingEnabled && <td className="p-4 font-semibold">{mB.totalSessions}</td>}
                      {content.abTestingEnabled && <td className="p-4 text-right text-gray-500">-</td>}
                    </tr>

                    <tr>
                      <td className="p-4 font-medium flex items-center gap-2">
                        <Play className="w-3.5 h-3.5 text-gray-400" />
                        Lancements vidéo (Play Rate)
                      </td>
                      <td className="p-4 font-bold text-blue-700">
                        {mA.playRate}% <span className="text-gray-400 font-normal">({mA.totalPlays})</span>
                      </td>
                      {content.abTestingEnabled && (
                        <td className="p-4 font-bold text-emerald-700">
                          {mB.playRate}% <span className="text-gray-400 font-normal">({mB.totalPlays})</span>
                        </td>
                      )}
                      {content.abTestingEnabled && (
                        <td className="p-4 text-right font-bold">
                          {mB.playRate >= mA.playRate ? (
                            <span className="text-emerald-600">+{((mB.playRate - mA.playRate) || 0).toFixed(1)}%</span>
                          ) : (
                            <span className="text-blue-600">+{((mA.playRate - mB.playRate) || 0).toFixed(1)}%</span>
                          )}
                        </td>
                      )}
                    </tr>

                    <tr className="bg-amber-50/20">
                      <td className="p-4 font-bold text-amber-900 flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        Rétention Hook 3s (Accroche Initiale)
                      </td>
                      <td className="p-4 font-bold text-blue-700">{mA.hook3sRate}%</td>
                      {content.abTestingEnabled && (
                        <td className="p-4 font-bold text-emerald-700">{mB.hook3sRate}%</td>
                      )}
                      {content.abTestingEnabled && (
                        <td className="p-4 text-right font-bold">
                          {mB.hook3sRate >= mA.hook3sRate ? (
                            <span className="text-emerald-600">+{((mB.hook3sRate - mA.hook3sRate) || 0).toFixed(1)}%</span>
                          ) : (
                            <span className="text-blue-600">+{((mA.hook3sRate - mB.hook3sRate) || 0).toFixed(1)}%</span>
                          )}
                        </td>
                      )}
                    </tr>

                    <tr className="bg-amber-50/20">
                      <td className="p-4 font-bold text-amber-900 flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        Rétention Hook 10s (Promesse de valeur)
                      </td>
                      <td className="p-4 font-bold text-blue-700">{mA.hook10sRate}%</td>
                      {content.abTestingEnabled && (
                        <td className="p-4 font-bold text-emerald-700">{mB.hook10sRate}%</td>
                      )}
                      {content.abTestingEnabled && (
                        <td className="p-4 text-right font-bold">
                          {mB.hook10sRate >= mA.hook10sRate ? (
                            <span className="text-emerald-600">+{((mB.hook10sRate - mA.hook10sRate) || 0).toFixed(1)}%</span>
                          ) : (
                            <span className="text-blue-600">+{((mA.hook10sRate - mB.hook10sRate) || 0).toFixed(1)}%</span>
                          )}
                        </td>
                      )}
                    </tr>

                    <tr className="bg-amber-50/40">
                      <td className="p-4 font-bold text-amber-900 flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        Rétention Hook 30s (Pattern Interrupt)
                      </td>
                      <td className="p-4 font-bold text-blue-700">{mA.hook30sRate}%</td>
                      {content.abTestingEnabled && (
                        <td className="p-4 font-bold text-emerald-700">{mB.hook30sRate}%</td>
                      )}
                      {content.abTestingEnabled && (
                        <td className="p-4 text-right font-bold">
                          {mB.hook30sRate >= mA.hook30sRate ? (
                            <span className="text-emerald-600">+{((mB.hook30sRate - mA.hook30sRate) || 0).toFixed(1)}%</span>
                          ) : (
                            <span className="text-blue-600">+{((mA.hook30sRate - mB.hook30sRate) || 0).toFixed(1)}%</span>
                          )}
                        </td>
                      )}
                    </tr>

                    <tr className="bg-amber-50/20">
                      <td className="p-4 font-bold text-amber-900 flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        Rétention Hook 45s (Fin de l'intro)
                      </td>
                      <td className="p-4 font-bold text-blue-700">{mA.hook45sRate}%</td>
                      {content.abTestingEnabled && (
                        <td className="p-4 font-bold text-emerald-700">{mB.hook45sRate}%</td>
                      )}
                      {content.abTestingEnabled && (
                        <td className="p-4 text-right font-bold">
                          {mB.hook45sRate >= mA.hook45sRate ? (
                            <span className="text-emerald-600">+{((mB.hook45sRate - mA.hook45sRate) || 0).toFixed(1)}%</span>
                          ) : (
                            <span className="text-blue-600">+{((mA.hook45sRate - mB.hook45sRate) || 0).toFixed(1)}%</span>
                          )}
                        </td>
                      )}
                    </tr>

                    <tr>
                      <td className="p-4 font-medium flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Passage au Midpoint CTA (04:30)
                      </td>
                      <td className="p-4 font-semibold">{mA.midpointRate}%</td>
                      {content.abTestingEnabled && <td className="p-4 font-semibold">{mB.midpointRate}%</td>}
                      {content.abTestingEnabled && (
                        <td className="p-4 text-right font-bold">
                          {mB.midpointRate >= mA.midpointRate ? (
                            <span className="text-emerald-600">+{((mB.midpointRate - mA.midpointRate) || 0).toFixed(1)}%</span>
                          ) : (
                            <span className="text-blue-600">+{((mA.midpointRate - mB.midpointRate) || 0).toFixed(1)}%</span>
                          )}
                        </td>
                      )}
                    </tr>

                    <tr>
                      <td className="p-4 font-medium flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Temps Moyen Visionné
                      </td>
                      <td className="p-4 font-semibold">
                        {Math.floor(mA.avgWatchSeconds / 60)}m {mA.avgWatchSeconds % 60}s ({mA.avgWatchPercent}%)
                      </td>
                      {content.abTestingEnabled && (
                        <td className="p-4 font-semibold">
                          {Math.floor(mB.avgWatchSeconds / 60)}m {mB.avgWatchSeconds % 60}s ({mB.avgWatchPercent}%)
                        </td>
                      )}
                      {content.abTestingEnabled && <td className="p-4 text-right font-bold text-gray-500">-</td>}
                    </tr>

                    <tr className="bg-emerald-50/40">
                      <td className="p-4 font-bold text-emerald-950 flex items-center gap-2">
                        <MousePointerClick className="w-3.5 h-3.5 text-emerald-600" />
                        Clics sur le CTA "Get Started Now!"
                      </td>
                      <td className="p-4 font-bold text-emerald-800">
                        {mA.ctaClickRate}% <span className="text-gray-400 font-normal">({mA.ctaClicks} clics)</span>
                      </td>
                      {content.abTestingEnabled && (
                        <td className="p-4 font-bold text-emerald-800">
                          {mB.ctaClickRate}% <span className="text-gray-400 font-normal">({mB.ctaClicks} clics)</span>
                        </td>
                      )}
                      {content.abTestingEnabled && (
                        <td className="p-4 text-right font-black">
                          {mB.ctaClickRate >= mA.ctaClickRate ? (
                            <span className="text-emerald-600">+{((mB.ctaClickRate - mA.ctaClickRate) || 0).toFixed(1)}%</span>
                          ) : (
                            <span className="text-blue-600">+{((mA.ctaClickRate - mB.ctaClickRate) || 0).toFixed(1)}%</span>
                          )}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Retention Drop-off Curve */}
          <Card className="border-[#e6e2d6] bg-white shadow-xs">
            <CardHeader className="border-b border-[#f0ede6] pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-[#1a1918]">
                    Courbe de Rétention & Drop-off (Timecode par Timecode)
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">
                    Visualisez exactement où les spectateurs décrochent au fil de la vidéo.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    {content.variantAName || 'Variante A'}
                  </span>
                  {content.abTestingEnabled && (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      {content.variantBName || 'Variante B'}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <VslRetentionChart
                data={analyticsData?.dropoffCurve || []}
                variantAName={content.variantAName}
                variantBName={content.variantBName}
                abTestingEnabled={content.abTestingEnabled}
              />

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-gray-100 pt-3">
                <div className="p-2.5 rounded bg-amber-50/60 border border-amber-200/60 text-amber-900">
                  <b className="block">0:00 - 0:45 : The Hook</b>
                  <span className="text-[11px] text-amber-700">Le point critique où 70% des abandons se produisent.</span>
                </div>
                <div className="p-2.5 rounded bg-pink-50/60 border border-pink-200/60 text-pink-900">
                  <b className="block">04:30 : Midpoint CTA</b>
                  <span className="text-[11px] text-pink-700">Premier appel à l'action pour les prospects pressés.</span>
                </div>
                <div className="p-2.5 rounded bg-purple-50/60 border border-purple-200/60 text-purple-900">
                  <b className="block">09:00 : Main Pitch CTA</b>
                  <span className="text-[11px] text-purple-700">Dévoilement des 3 piliers et de l'offre finale.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Live Sessions Table */}
          <Card className="border-[#e6e2d6] bg-white shadow-xs">
            <CardHeader className="border-b border-[#f0ede6] pb-4">
              <CardTitle className="text-base font-bold text-[#1a1918]">
                Journal en Direct des Sessions VSL
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                Les derniers visiteurs ayant interagi avec la vidéo sur votre landing page.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf8f5] text-[#73706b] border-b border-[#e6e2d6]">
                    <tr>
                      <th className="p-3.5">ID Visiteur</th>
                      <th className="p-3.5">Variante</th>
                      <th className="p-3.5">Temps Regardé</th>
                      <th className="p-3.5">% de la Vidéo</th>
                      <th className="p-3.5">Hook 30s Validé</th>
                      <th className="p-3.5">Clic CTA</th>
                      <th className="p-3.5 text-right">Date / Heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede6] text-[#1a1918]">
                    {analyticsData?.recentSessions && analyticsData.recentSessions.length > 0 ? (
                      analyticsData.recentSessions.map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-50/50">
                          <td className="p-3.5 font-mono text-[11px] text-gray-500">{s.visitorId}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.variant === 'B' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              Variante {s.variant}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium">{s.watchTime}</td>
                          <td className="p-3.5 font-medium">{s.maxPercent}</td>
                          <td className="p-3.5">
                            {s.hook30s ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                <Check className="w-3 h-3" /> Oui
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">Non</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {s.ctaClicked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                🎯 Clic CTA
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right text-gray-500 text-[11px]">
                            {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-500 text-xs">
                          Aucune session enregistrée pour le moment. Ouvrez `/opt-in` pour générer votre première session.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Page 1 VSL Video A */}
          <Card className="border-[#e6e2d6] shadow-xs bg-white">
            <CardHeader className="border-b border-[#f0ede6] pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">
                    1A
                  </span>
                  <CardTitle className="text-base font-bold text-[#1a1918]">
                    Vidéo VSL Variante A (Principale)
                  </CardTitle>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100/60 text-blue-800 px-2 py-0.5 rounded-xs">
                  Landing Page
                </span>
              </div>
              <CardDescription className="text-xs text-[#73706b] mt-1">
                La vidéo VSL standard présentée sur la page d'accueil d'opt-in.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 flex flex-col gap-2">
                  <Label className="text-xs font-semibold text-[#1a1918]">Aperçu de la vidéo A</Label>
                  <div className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-inner border border-gray-200 flex items-center justify-center">
                    {content.salesVideoA || content.salesVideo ? (
                      <video
                        src={content.salesVideoA || content.salesVideo}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">Aucune vidéo sélectionnée</span>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-[#1a1918]">
                      URL de la vidéo A ou lien direct
                    </Label>
                    <Input
                      value={content.salesVideoA || content.salesVideo}
                      onChange={(e) => setContent({ ...content, salesVideoA: e.target.value, salesVideo: e.target.value })}
                      placeholder="ex: /videos/New_Video.mp4"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>

                  <div className="p-4 border-2 border-dashed border-[#e6e2d6] hover:border-[#9e4733]/50 rounded-lg bg-[#faf8f5] transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-[#e6e2d6] flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4 text-[#73706b]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#1a1918]">
                          Uploader la vidéo Variante A
                        </p>
                        <p className="text-[11px] text-[#73706b]">
                          Format MP4, WEBM ou MOV
                        </p>
                      </div>
                    </div>

                    <input
                      ref={salesAFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleUploadFile(
                            file,
                            (url) => setContent((prev) => ({ ...prev, salesVideoA: url, salesVideo: url })),
                            setUploadingSalesA
                          )
                        }
                      }}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingSalesA}
                      onClick={() => salesAFileInputRef.current?.click()}
                      className="shrink-0 text-xs font-semibold cursor-pointer border-[#e6e2d6] hover:bg-white"
                    >
                      {uploadingSalesA ? (
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

          {/* 1. Page 1 VSL Video B (Challenger) */}
          <Card className="border-[#e6e2d6] shadow-xs bg-white">
            <CardHeader className="border-b border-[#f0ede6] pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center">
                    1B
                  </span>
                  <CardTitle className="text-base font-bold text-[#1a1918]">
                    Vidéo VSL Variante B (Challenger A/B Test)
                  </CardTitle>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100/60 text-emerald-800 px-2 py-0.5 rounded-xs">
                  A/B Challenger
                </span>
              </div>
              <CardDescription className="text-xs text-[#73706b] mt-1">
                La seconde vidéo avec une intro ou un hook différent pour tester l'amélioration du taux de rétention.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 flex flex-col gap-2">
                  <Label className="text-xs font-semibold text-[#1a1918]">Aperçu de la vidéo B</Label>
                  <div className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-inner border border-gray-200 flex items-center justify-center">
                    {content.salesVideoB ? (
                      <video
                        src={content.salesVideoB}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">Aucune vidéo sélectionnée</span>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-[#1a1918]">
                      URL de la vidéo B ou lien direct
                    </Label>
                    <Input
                      value={content.salesVideoB || ''}
                      onChange={(e) => setContent({ ...content, salesVideoB: e.target.value })}
                      placeholder="ex: /videos/New_Video_HookB.mp4"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>

                  <div className="p-4 border-2 border-dashed border-[#e6e2d6] hover:border-[#9e4733]/50 rounded-lg bg-[#faf8f5] transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-[#e6e2d6] flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4 text-[#73706b]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#1a1918]">
                          Uploader la vidéo Variante B
                        </p>
                        <p className="text-[11px] text-[#73706b]">
                          Format MP4, WEBM ou MOV
                        </p>
                      </div>
                    </div>

                    <input
                      ref={salesBFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleUploadFile(
                            file,
                            (url) => setContent((prev) => ({ ...prev, salesVideoB: url })),
                            setUploadingSalesB
                          )
                        }
                      }}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingSalesB}
                      onClick={() => salesBFileInputRef.current?.click()}
                      className="shrink-0 text-xs font-semibold cursor-pointer border-[#e6e2d6] hover:bg-white"
                    >
                      {uploadingSalesB ? (
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

          {/* 2. Page 3 Confirmation Video */}
          <Card className="border-[#e6e2d6] shadow-xs bg-white">
            <CardHeader className="border-b border-[#f0ede6] pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <CardTitle className="text-base font-bold text-[#1a1918]">
                    Vidéo d'attente / Confirmation (Page 3 : /confirmation)
                  </CardTitle>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100/60 text-emerald-800 px-2 py-0.5 rounded-xs">
                  Post-Réservation
                </span>
              </div>
              <CardDescription className="text-xs text-[#73706b] mt-1">
                La vidéo explicative lue après la réservation d'un créneau dans Cal.com ("Watch this before your call").
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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

                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-[#1a1918]">
                      URL de la vidéo de confirmation
                    </Label>
                    <Input
                      value={content.confirmationVideo}
                      onChange={(e) =>
                        setContent({ ...content, confirmationVideo: e.target.value })
                      }
                      placeholder="ex: /videos/confirmation.mp4"
                      className="mt-1 font-mono text-xs"
                    />
                  </div>

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
                          Format MP4, WEBM ou MOV
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

          {/* 3. FAQ Video Cards Section */}
          <Card className="border-[#e6e2d6] shadow-xs bg-white">
            <CardHeader className="border-b border-[#f0ede6] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-50 text-orange-700 text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <CardTitle className="text-base font-bold text-[#1a1918]">
                      Vidéos des Questions Fréquentes (FAQ)
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-[#73706b] mt-1">
                    Les modules vidéo FAQ visibles sur la page d'atterrissage et la page de confirmation.
                  </CardDescription>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddFaq}
                  className="text-xs font-semibold border-[#e6e2d6] hover:bg-[#faf8f5] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Ajouter une question
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {content.faqVideos.map((faq, index) => {
                  const fileRef = `faq-file-${faq.id}`
                  const isUploadingThis = uploadingFaqId === faq.id

                  return (
                    <div
                      key={faq.id}
                      className="p-4 rounded-xl border border-[#e6e2d6] bg-[#faf8f5]/60 hover:bg-[#faf8f5] transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
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

                        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black border border-gray-200">
                          {faq.src ? (
                            <video src={faq.src} controls className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                              Pas de vidéo
                            </div>
                          )}
                        </div>

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

                        <span className="text-[11px] text-[#73706b]">Fichier vidéo :</span>
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
        </div>
      )}

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
