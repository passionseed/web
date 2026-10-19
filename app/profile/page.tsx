'use client'

import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { isAbortError } from '@/lib/supabase/errors'
import { dateOfBirthProblem, normalizeDateOfBirth } from '@/lib/profile-completion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowRight,
  BookOpen,
  Brain,
  Building,
  Calendar,
  CheckCircle2,
  Compass,
  Edit3,
  Flame,
  GraduationCap,
  Layers3,
  Mail,
  Save,
  School,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { MentorAvailabilitySettings } from '@/components/profile/MentorAvailabilitySettings'
import { BadgeGallery } from '@/components/profile/BadgeGallery'
import type { LearningJourneySummary } from '@/components/profile/profile-dashboard-utils'

interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  username: string
  avatar_url: string | null
  date_of_birth: string | null
  discord_uid: string | null
  education_level: 'high_school' | 'university' | 'unaffiliated' | null
  created_at: string | null
  updated_at: string | null
}

interface DashboardData {
  roles: string[]
  view: {
    isInstructorView: boolean
    themeClassName: 'dawn-theme' | 'dusk-theme'
    buttonClassName: 'ei-button-dawn' | 'ei-button-dusk'
    accentTextClassName: string
    surfaceBorderClassName: string
  }
  classrooms: Array<{
    classroomId: string
    role: string
    name: string
    description: string | null
  }>
  teams: Array<{
    teamId: string
    classroomId: string | null
    name: string
    isLeader: boolean
  }>
  projects: {
    count: number
    recent: Array<{
      id: string
      name: string
      created_at: string
    }>
  }
  workshops: {
    count: number
    recent: Array<{
      id: string
      title: string
      slug: string | null
    }>
  }
  reflections: {
    streak: number
    recent: Array<{
      id: string
      createdAt: string
      overallReflection: string | null
      satisfactionRating: number | null
      progressRating: number | null
      challengeRating: number | null
      topics: Array<{
        id: string
        text: string
        notes: string | null
      }>
    }>
  }
  learningJourney: LearningJourneySummary
  mentorAvailabilityDays: number
}

type StatItem = {
  label: string
  value: string
  hint: string
  icon: typeof Compass
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [discordId, setDiscordId] = useState('')
  const [educationLevel, setEducationLevel] = useState<'high_school' | 'university' | 'unaffiliated'>('high_school')

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(hover: none)')
    if (!mediaQuery.matches) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('in-view', entry.isIntersecting)
        })
      },
      { threshold: 0.18 }
    )

    const surfaces = document.querySelectorAll(
      '.profile-dashboard-surface .ei-card, .profile-dashboard-surface .ei-button-dawn, .profile-dashboard-surface .ei-button-dusk'
    )

    surfaces.forEach((surface) => observer.observe(surface))

    return () => observer.disconnect()
  }, [dashboard?.view.themeClassName, isEditing, profile?.id])

  const createProfile = async (user: any) => {
    try {
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          username:
            user.user_metadata?.preferred_username ||
            user.email?.split('@')[0] ||
            `user_${user.id.slice(0, 8)}`,
          avatar_url: user.user_metadata?.avatar_url || null,
          education_level: 'high_school',
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        toast.error('Failed to create profile')
        return null
      }

      setProfile(newProfile)
      setFullName(newProfile.full_name || '')
      setUsername(newProfile.username || '')
      setDateOfBirth(newProfile.date_of_birth || '')
      setDiscordId(newProfile.discord_uid || '')
      setEducationLevel(newProfile.education_level || 'high_school')
      toast.success('Profile created successfully')
      return newProfile as UserProfile
    } catch (error) {
      console.error('Profile creation error:', error)
      toast.error('Failed to create profile')
      return null
    }
  }

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/profile/dashboard', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const data = (await response.json()) as DashboardData
      setDashboard(data)
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      toast.error('Some profile details could not be loaded')
      setDashboard(null)
    }
  }

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error('Please log in to view your profile')
        return
      }

      let nextProfile: UserProfile | null = null

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          nextProfile = await createProfile(user)
        } else if (!isAbortError(profileError)) {
          console.error('Error fetching profile:', profileError)
          toast.error('Failed to load profile')
        }
      } else {
        nextProfile = profileData as UserProfile
      }

      if (!nextProfile) {
        return
      }

      setProfile(nextProfile)
      setFullName(nextProfile.full_name || '')
      setUsername(nextProfile.username || '')
      setDateOfBirth(nextProfile.date_of_birth || '')
      setDiscordId(nextProfile.discord_uid || '')
      setEducationLevel(nextProfile.education_level || 'high_school')

      await fetchDashboard()
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Profile fetch error:', error)
        toast.error('Failed to load profile')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setProfile((current) =>
        current ? { ...current, avatar_url: result.fileUrl } : null
      )
      toast.success('Avatar updated successfully')
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) {
      return
    }

    // Thai students often type the Buddhist Era year; store it as Gregorian.
    const nextDateOfBirth = dateOfBirth ? normalizeDateOfBirth(dateOfBirth) : null
    if (nextDateOfBirth && dateOfBirthProblem(nextDateOfBirth)) {
      toast.error('Please check your date of birth. The year looks wrong.')
      return
    }

    setSaving(true)
    try {
      const nextUpdatedAt = new Date().toISOString()

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          username,
          date_of_birth: nextDateOfBirth,
          discord_uid: discordId || null,
          education_level: educationLevel,
          updated_at: nextUpdatedAt,
        })
        .eq('id', profile.id)

      if (error) {
        throw new Error('Failed to update profile')
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              full_name: fullName || null,
              username,
              date_of_birth: nextDateOfBirth,
              discord_uid: discordId || null,
              education_level: educationLevel,
              updated_at: nextUpdatedAt,
            }
          : null
      )

      setIsEditing(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Profile save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (!profile) {
      return
    }

    setFullName(profile.full_name || '')
    setUsername(profile.username || '')
    setDateOfBirth(profile.date_of_birth || '')
    setDiscordId(profile.discord_uid || '')
    setEducationLevel(profile.education_level || 'high_school')
    setIsEditing(false)
  }

  const openAccountEditor = () => {
    setIsEditing(true)
    document.getElementById('account-details')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  if (loading) {
    return <ProfileLoadingState />
  }

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-10 text-center text-slate-300">
        <p>Profile not found. Please try logging out and back in.</p>
      </div>
    )
  }

  const view = dashboard?.view ?? {
    isInstructorView: false,
    themeClassName: 'dawn-theme' as const,
    buttonClassName: 'ei-button-dawn' as const,
    accentTextClassName: 'text-blue-200',
    surfaceBorderClassName: 'border-blue-400/20',
  }

  const isInstructorView = view.isInstructorView

  const activeMapsCount = dashboard?.learningJourney.activeMapCount || 0
  const nextNodesCount = dashboard?.learningJourney.nextNodes.length || 0
  const reflectionsCount = dashboard?.reflections.recent.length || 0
  const streakCount = dashboard?.reflections.streak || 0
  const classroomsCount = dashboard?.classrooms.length || 0

  return (
    <div className={`${view.themeClassName} profile-dashboard-surface relative min-h-screen bg-[#020617] text-slate-200`}>
      <ProfileAtmosphere isInstructorView={isInstructorView} />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
        {/* Instagram Header Card */}
        <section className="ei-card rounded-[28px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="h-28 w-28 border-2 border-white/20 bg-white/5 shadow-xl md:h-36 md:w-36">
                <AvatarImage src={profile.avatar_url ?? undefined} alt="Profile picture" />
                <AvatarFallback className="bg-white/10 text-3xl font-bold text-white">
                  {profile.full_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <label
                htmlFor="avatar-upload"
                className="absolute bottom-1 right-1 inline-flex cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 p-2 text-white transition-transform hover:scale-105 active:scale-95"
                title="Change Avatar"
              >
                <Upload className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* User Info & Quick Stats Header */}
            <div className="flex-1 space-y-5 text-center md:text-left">
              {/* Username + Action Buttons */}
              <div className="flex flex-col items-center gap-4 sm:flex-row md:justify-start">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {profile.username}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    {isEditing ? 'Close Edit' : 'Edit profile'}
                  </button>
                  <Link
                    href={`/u/${profile.username}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Portfolio
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/me"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>

              {/* Instagram Stats Row */}
              <div className="flex justify-center gap-8 border-y border-white/10 py-3 md:justify-start">
                <div className="text-center md:text-left">
                  <span className="block text-lg font-bold text-white sm:text-xl">
                    {isInstructorView ? classroomsCount : activeMapsCount}
                  </span>
                  <span className="text-xs text-slate-400">
                    {isInstructorView ? 'Classrooms' : 'Active Maps'}
                  </span>
                </div>
                <div className="text-center md:text-left">
                  <span className="block text-lg font-bold text-white sm:text-xl">{nextNodesCount}</span>
                  <span className="text-xs text-slate-400">Next Steps</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="block text-lg font-bold text-white sm:text-xl">{streakCount}🔥</span>
                  <span className="text-xs text-slate-400">Streak</span>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="space-y-1 text-sm text-slate-300">
                <p className="font-semibold text-white">{profile.full_name || profile.username}</p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 md:justify-start">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {profile.email}
                  </span>
                  <span>•</span>
                  <span>{getEducationLabel(profile.education_level)}</span>
                  <span>•</span>
                  <span>Joined {formatDate(profile.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Edit Form Drawer / Toggle Section */}
        {isEditing && (
          <section className="mt-6 ei-card rounded-[28px] border border-white/15 p-6 bg-white/[0.04]">
            <h2 className="text-lg font-semibold text-white mb-4">Edit Profile Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="full_name" className="text-xs text-slate-300">Full Name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-white/10 bg-white/5 text-white"
                />
              </Field>
              <Field>
                <Label htmlFor="username" className="text-xs text-slate-300">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-white/10 bg-white/5 text-white"
                />
              </Field>
              <Field>
                <Label htmlFor="education" className="text-xs text-slate-300">Education Level</Label>
                <select
                  id="education"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value as any)}
                  className="w-full rounded-md border border-white/10 bg-slate-900 p-2 text-sm text-white"
                >
                  <option value="high_school">High School</option>
                  <option value="university">University</option>
                  <option value="unaffiliated">Unaffiliated</option>
                </select>
              </Field>
              <Field>
                <Label htmlFor="discord" className="text-xs text-slate-300">Discord User ID</Label>
                <Input
                  id="discord"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                  placeholder="e.g. username#0000"
                  className="border-white/10 bg-white/5 text-white"
                />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-blue-600/80 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </section>
        )}

        {/* Tabbed Content Grid */}
        <ProfileInstagramTabs dashboard={dashboard} isInstructorView={isInstructorView} />
      </div>
    </div>
  )
}

function ProfileInstagramTabs({
  dashboard,
  isInstructorView,
}: {
  dashboard: DashboardData | null
  isInstructorView: boolean
}) {
  const [activeTab, setActiveTab] = useState<'grid' | 'badges' | 'spaces'>('grid')

  return (
    <div className="mt-8">
      {/* Tabs bar */}
      <div className="flex justify-center border-t border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-2 border-t-2 px-6 py-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'grid'
              ? 'border-white text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="h-4 w-4" />
          {isInstructorView ? 'Teaching' : 'Journey Grid'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('badges')}
          className={`flex items-center gap-2 border-t-2 px-6 py-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'badges'
              ? 'border-white text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Badges & Reflect
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('spaces')}
          className={`flex items-center gap-2 border-t-2 px-6 py-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'spaces'
              ? 'border-white text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Spaces & Settings
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {activeTab === 'grid' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard?.learningJourney.nextNodes.map((item) => (
              <Link
                key={item.node.id}
                href={`/map/${item.map.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                    {item.map.title}
                  </span>
                  <h3 className="mt-1 text-base font-semibold text-white group-hover:text-blue-200">
                    {item.node.title}
                  </h3>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span className="capitalize">{formatStatus(item.status)}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}

            {!dashboard?.learningJourney.nextNodes.length && (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">
                <p className="text-sm">No active map steps yet.</p>
                <Link
                  href="/map"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:underline"
                >
                  Explore pathlabs <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="space-y-6">
            <BadgeGallery />
            {dashboard?.reflections.recent.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Recent Reflections</h3>
                <div className="space-y-3">
                  {dashboard.reflections.recent.slice(0, 3).map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs text-slate-300">
                      <p className="font-medium text-white">{r.overallReflection || 'Daily Reflection'}</p>
                      <p className="mt-1 text-slate-400">{formatDate(r.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'spaces' && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Classrooms</h3>
              <ListCard
                title=""
                items={(dashboard?.classrooms || []).map((c) => ({
                  key: c.classroomId,
                  title: c.name,
                  subtitle: c.role,
                  href: `/classrooms/${c.classroomId}`,
                }))}
                emptyText="No classrooms joined yet."
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Mentor Settings</h3>
              {isInstructorView ? (
                <MentorAvailabilitySettings initialDays={dashboard?.mentorAvailabilityDays || 0} />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-xs text-slate-400">
                  Mentor settings are available for instructors/mentors.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileAtmosphere({ isInstructorView }: { isInstructorView: boolean }) {
  const gradient = isInstructorView
    ? 'linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)'
    : 'linear-gradient(to bottom, #020617 0%, #0f172a 28%, #1e1b4b 58%, #312e81 82%, #1e3a5f 100%)'

  const blobA = isInstructorView
    ? 'radial-gradient(circle, rgba(251, 146, 60, 0.22) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(59, 130, 246, 0.28) 0%, transparent 70%)'

  const blobB = isInstructorView
    ? 'radial-gradient(circle, rgba(190, 24, 93, 0.2) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(168, 85, 247, 0.26) 0%, transparent 70%)'

  const blobC = isInstructorView
    ? 'radial-gradient(circle, rgba(147, 51, 234, 0.16) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 70%)'

  const horizon = isInstructorView
    ? 'radial-gradient(ellipse 75% 100% at 50% 100%, rgba(251, 146, 60, 0.2) 0%, transparent 100%)'
    : 'radial-gradient(ellipse 75% 100% at 50% 100%, rgba(254, 217, 92, 0.18) 0%, transparent 100%)'

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: gradient }} />
      <div
        className="absolute rounded-full blur-[90px] opacity-40"
        style={{ width: '34vw', height: '34vw', left: '-4%', top: '12%', background: blobA }}
      />
      <div
        className="absolute rounded-full blur-[90px] opacity-32"
        style={{ width: '40vw', height: '36vw', right: '-8%', top: '-6%', background: blobB }}
      />
      <div
        className="absolute rounded-full blur-[90px] opacity-28"
        style={{ width: '45vw', height: '34vw', left: '18%', bottom: '10%', background: blobC }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-80 opacity-50"
        style={{ background: horizon, filter: 'blur(40px)' }}
      />
    </div>
  )
}

function ProfileLoadingState() {
  return (
    <div className="dawn-theme relative min-h-screen overflow-hidden bg-[#020617] text-slate-200">
      <ProfileAtmosphere isInstructorView={false} />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="ei-card rounded-[28px] border border-white/10 p-6 sm:p-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 rounded-full bg-white/10" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-28 rounded bg-white/10" />
                <div className="h-10 w-64 rounded bg-white/10" />
                <div className="h-4 w-80 rounded bg-white/10" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 rounded-[22px] bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ListCard({
  title,
  items,
  emptyText,
}: {
  title: string
  items: Array<{ key: string; title: string; subtitle: string; href: string }>
  emptyText: string
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      {title ? <p className="text-sm font-semibold text-white">{title}</p> : null}
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
          >
            <p className="text-sm font-medium text-white">{item.title}</p>
            <p className="mt-1 text-sm text-slate-400">{item.subtitle}</p>
          </Link>
        ))}
        {!items.length ? (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
            {emptyText}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Field({ children }: { children: ReactNode }) {
  return <div className="space-y-1.5">{children}</div>
}

function getEducationLabel(value: UserProfile['education_level']) {
  switch (value) {
    case 'high_school':
      return 'High school'
    case 'university':
      return 'University'
    case 'unaffiliated':
      return 'Unaffiliated'
    default:
      return 'Education not set'
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Unknown'
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ')
}
