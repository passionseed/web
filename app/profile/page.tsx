'use client'

import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
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
        } else {
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
      console.error('Profile fetch error:', error)
      toast.error('Failed to load profile')
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

    setSaving(true)
    try {
      const nextUpdatedAt = new Date().toISOString()

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          username,
          date_of_birth: dateOfBirth || null,
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
              date_of_birth: dateOfBirth || null,
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

  const primaryStats = getPrimaryStats(dashboard, view.isInstructorView)
  const buttonClassName = view.buttonClassName
  const isInstructorView = view.isInstructorView

  return (
    <div
      className={`${view.themeClassName} profile-dashboard-surface relative min-h-screen overflow-hidden bg-[#020617] text-slate-200`}
    >
      <ProfileAtmosphere isInstructorView={isInstructorView} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <section className="ei-card rounded-[28px] border border-white/10 px-6 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
            <div className="space-y-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="relative shrink-0">
                  <Avatar className="h-28 w-28 border border-white/15 bg-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                    <AvatarImage src={profile.avatar_url ?? undefined} alt="Profile picture" />
                    <AvatarFallback className="bg-white/10 text-3xl text-white">
                      {profile.full_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-1 right-1 inline-flex cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
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

                <div className="min-w-0 flex-1 space-y-4">
                  <div className="space-y-2">
                    <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${view.accentTextClassName}`}>
                      {isInstructorView ? 'Dusk Profile' : 'Dawn Profile'}
                    </p>
                    <div className="space-y-1">
                      <h1 className="font-[family-name:var(--font-libre-franklin)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        {profile.full_name || profile.username}
                      </h1>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                        <span className="inline-flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {profile.email}
                        </span>
                        <span className="inline-flex items-center gap-2 text-slate-400">
                          <Calendar className="h-4 w-4" />
                          Member since {formatDate(profile.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {dashboard?.roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium capitalize text-slate-200"
                      >
                        {role.replace(/-/g, ' ')}
                      </span>
                    ))}
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                      {getEducationLabel(profile.education_level)}
                    </span>
                    {uploading && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                        Uploading avatar...
                      </span>
                    )}
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    {isInstructorView
                      ? 'Your profile now leads with the real signals that matter for mentoring: classrooms, teams, availability, and the work you are actively shaping.'
                      : 'Your profile now reflects the real arc of your learning journey: active maps, unlocked next steps, reflection momentum, and the spaces where you are building.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {primaryStats.map((stat) => (
                  <StatTile key={stat.label} {...stat} />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="ei-card ei-card--static rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <SectionEyebrow title="Quick actions" />
                <div className="mt-4 flex flex-col gap-3">
                  <Link href="/me" className={`${buttonClassName} justify-center text-sm font-semibold`}>
                    Open dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={openAccountEditor}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit account details
                  </button>
                  <Link
                    href={isInstructorView ? '/classrooms' : '/map'}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    {isInstructorView ? 'Go to classrooms' : 'Explore maps'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="ei-card ei-card--static rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <SectionEyebrow title={isInstructorView ? 'Role focus' : 'Current arc'} />
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {isInstructorView
                    ? dashboard?.mentorAvailabilityDays
                      ? `You have availability configured on ${dashboard.mentorAvailabilityDays} day${dashboard.mentorAvailabilityDays === 1 ? '' : 's'} this week.`
                      : 'You have not configured mentor availability yet.'
                    : dashboard?.learningJourney.nextNodes.length
                      ? `Your next unlocked step is ${dashboard.learningJourney.nextNodes[0].node.title} in ${dashboard.learningJourney.nextNodes[0].map.title}.`
                      : 'You do not have an unlocked next step yet. Enroll in a map to start building momentum.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="ei-card rounded-[28px] border border-white/10 p-6 sm:p-7">
            <SectionHeader
              eyebrow={isInstructorView ? 'Teaching footprint' : 'Current journey'}
              title={isInstructorView ? 'Classrooms, teams, and availability' : 'Real progress across your maps'}
              description={
                isInstructorView
                  ? 'This section prioritizes the spaces you lead and the real structures students encounter.'
                  : 'Unlocked next steps and map progress are derived from your live enrollments and node completion data.'
              }
            />

            {isInstructorView ? (
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <MiniMetric
                    label="Classrooms"
                    value={String(dashboard?.classrooms.length || 0)}
                    hint="Active memberships"
                  />
                  <MiniMetric
                    label="Teams"
                    value={String(dashboard?.teams.length || 0)}
                    hint="Across your classrooms"
                  />
                  <MiniMetric
                    label="Availability"
                    value={String(dashboard?.mentorAvailabilityDays || 0)}
                    hint="Days configured"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <ListCard
                    title="Classroom spaces"
                    items={(dashboard?.classrooms || []).slice(0, 4).map((classroom) => ({
                      key: classroom.classroomId,
                      title: classroom.name,
                      subtitle: classroom.description || `Role: ${classroom.role}`,
                      href: `/classrooms/${classroom.classroomId}`,
                    }))}
                    emptyText="No classrooms yet."
                  />
                  <ListCard
                    title="Team groups"
                    items={(dashboard?.teams || []).slice(0, 4).map((team) => ({
                      key: team.teamId,
                      title: team.name,
                      subtitle: team.isLeader ? 'Team leader' : 'Team member',
                      href: team.classroomId ? `/classrooms/${team.classroomId}` : '/classrooms',
                    }))}
                    emptyText="No team memberships yet."
                  />
                </div>

                {dashboard?.learningJourney.activeMapCount ? (
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Your own learning snapshot</p>
                        <p className="text-sm text-slate-400">
                          {dashboard.learningJourney.activeMapCount} active map{dashboard.learningJourney.activeMapCount === 1 ? '' : 's'} with {dashboard.learningJourney.averageProgressPercentage}% average progress
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <MiniMetric
                    label="Active maps"
                    value={String(dashboard?.learningJourney.activeMapCount || 0)}
                    hint="Currently enrolled"
                  />
                  <MiniMetric
                    label="Completed nodes"
                    value={String(dashboard?.learningJourney.completedNodeCount || 0)}
                    hint="Passed or submitted"
                  />
                  <MiniMetric
                    label="In progress"
                    value={String(dashboard?.learningJourney.inProgressNodeCount || 0)}
                    hint="Nodes underway"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <ListCard
                    title="Unlocked next steps"
                    items={(dashboard?.learningJourney.nextNodes || []).map((nextNode) => ({
                      key: nextNode.node.id,
                      title: nextNode.node.title,
                      subtitle: `${nextNode.map.title} • ${formatStatus(nextNode.status)}`,
                      href: `/map/${nextNode.map.id}`,
                    }))}
                    emptyText="No unlocked steps yet. Explore a map to get started."
                  />
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-white">Active maps</p>
                    {(dashboard?.learningJourney.mapSummaries || []).slice(0, 4).map((map) => (
                      <div
                        key={map.mapId}
                        className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{map.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                              {map.category || 'Journey'}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-white">
                            {map.progressPercentage}%
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${isInstructorView ? 'bg-gradient-to-r from-orange-400 via-amber-400 to-pink-400' : 'bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400'}`}
                            style={{ width: `${Math.min(100, Math.max(0, map.progressPercentage))}%` }}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
                          <span>{map.completedNodes}/{map.totalNodes} nodes complete</span>
                          <span>{map.totalAssessments} assessments</span>
                          {map.nextNodeTitle ? <span>Next: {map.nextNodeTitle}</span> : null}
                        </div>
                      </div>
                    ))}

                    {!dashboard?.learningJourney.mapSummaries.length ? (
                      <EmptyPanel
                        text="No map enrollments yet. Once you start a learning map, this section will reflect your real progress."
                        href="/map"
                        cta="Browse maps"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="ei-card rounded-[28px] border border-white/10 p-6 sm:p-7">
            <SectionHeader
              eyebrow="Reflection & practice"
              title="Momentum outside the profile form"
              description="These signals come from your reflections, projects, and workshops rather than manually-entered profile fields."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <MiniMetric
                label="Reflection streak"
                value={String(dashboard?.reflections.streak || 0)}
                hint="Consecutive active days"
              />
              <MiniMetric
                label="Projects"
                value={String(dashboard?.projects.count || 0)}
                hint="Tracked in your workspace"
              />
              <MiniMetric
                label="Workshops"
                value={String(dashboard?.workshops.count || 0)}
                hint="Joined so far"
              />
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-sm font-semibold text-white">Recent reflection snapshots</p>
              {(dashboard?.reflections.recent || []).map((reflection) => (
                <div
                  key={reflection.id}
                  className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-200">
                      {formatDate(reflection.createdAt)}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      <span>S {reflection.satisfactionRating ?? '-'}</span>
                      <span>P {reflection.progressRating ?? '-'}</span>
                      <span>C {reflection.challengeRating ?? '-'}</span>
                    </div>
                  </div>
                  {reflection.topics.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reflection.topics.map((topic) => (
                        <span
                          key={topic.id}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                        >
                          {topic.text}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {reflection.overallReflection ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-300">
                      {reflection.overallReflection}
                    </p>
                  ) : null}
                </div>
              ))}

              {!dashboard?.reflections.recent.length ? (
                <EmptyPanel
                  text="No recent reflection entries yet. Once you write one, this section will pull the latest real entries here."
                  href="/me/reflection"
                  cta="Open reflection"
                />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <CompactList
                  title="Recent projects"
                  items={(dashboard?.projects.recent || []).map((project) => ({
                    key: project.id,
                    title: project.name,
                    subtitle: formatDate(project.created_at),
                  }))}
                  emptyText="No projects yet."
                />
                <CompactList
                  title="Recent workshops"
                  items={(dashboard?.workshops.recent || []).map((workshop) => ({
                    key: workshop.id,
                    title: workshop.title,
                    subtitle: workshop.slug ? `/workshops/${workshop.slug}` : 'Workshop',
                  }))}
                  emptyText="No workshops yet."
                />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="ei-card rounded-[28px] border border-white/10 p-6 sm:p-7">
            <SectionHeader
              eyebrow="Learning spaces"
              title="Where your profile is actually active"
              description="These are the classrooms and teams directly connected to your account right now."
            />

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ListCard
                title="Classrooms"
                items={(dashboard?.classrooms || []).map((classroom) => ({
                  key: classroom.classroomId,
                  title: classroom.name,
                  subtitle: classroom.description || `Role: ${classroom.role}`,
                  href: `/classrooms/${classroom.classroomId}`,
                }))}
                emptyText="No classroom memberships yet."
              />
              <ListCard
                title="Teams"
                items={(dashboard?.teams || []).map((team) => ({
                  key: team.teamId,
                  title: team.name,
                  subtitle: team.isLeader ? 'Leader' : 'Member',
                  href: team.classroomId ? `/classrooms/${team.classroomId}` : '/classrooms',
                }))}
                emptyText="No team memberships yet."
              />
            </div>
          </section>

          <section
            id="account-details"
            className="ei-card rounded-[28px] border border-white/10 p-6 sm:p-7"
          >
            <SectionHeader
              eyebrow="Account details"
              title={isEditing ? 'Edit your profile' : 'Identity and settings'}
              description="This section keeps the editable account fields, but it no longer has to pretend it is your whole profile."
            />

            <div className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field>
                  <Label htmlFor="fullName" className="ei-label text-xs uppercase tracking-[0.2em] text-slate-400">
                    Full name
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    disabled={!isEditing}
                    placeholder="Your full name"
                    className="ei-input h-11 border-white/10 bg-white/[0.04] disabled:opacity-80"
                  />
                </Field>

                <Field>
                  <Label htmlFor="username" className="ei-label text-xs uppercase tracking-[0.2em] text-slate-400">
                    Username
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={!isEditing}
                    placeholder="Username"
                    className="ei-input h-11 border-white/10 bg-white/[0.04] disabled:opacity-80"
                  />
                </Field>

                <Field>
                  <Label htmlFor="dateOfBirth" className="ei-label text-xs uppercase tracking-[0.2em] text-slate-400">
                    Date of birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    disabled={!isEditing}
                    className="ei-input h-11 border-white/10 bg-white/[0.04] disabled:opacity-80"
                  />
                </Field>

                <Field>
                  <Label htmlFor="discordId" className="ei-label text-xs uppercase tracking-[0.2em] text-slate-400">
                    Discord UID
                  </Label>
                  <Input
                    id="discordId"
                    value={discordId}
                    onChange={(event) => setDiscordId(event.target.value)}
                    disabled={!isEditing}
                    placeholder="Discord user id"
                    className="ei-input h-11 border-white/10 bg-white/[0.04] disabled:opacity-80"
                  />
                </Field>
              </div>

              <Field>
                <Label htmlFor="educationLevel" className="ei-label text-xs uppercase tracking-[0.2em] text-slate-400">
                  Education level
                </Label>
                <select
                  id="educationLevel"
                  value={educationLevel}
                  onChange={(event) =>
                    setEducationLevel(
                      event.target.value as 'high_school' | 'university' | 'unaffiliated'
                    )
                  }
                  disabled={!isEditing}
                  className="ei-select h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white disabled:opacity-80"
                >
                  <option value="high_school">High school</option>
                  <option value="university">University</option>
                  <option value="unaffiliated">Unaffiliated</option>
                </select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <EducationBadge
                  active={educationLevel === 'high_school'}
                  icon={School}
                  title="High school"
                  description="Currently in high school"
                />
                <EducationBadge
                  active={educationLevel === 'university'}
                  icon={GraduationCap}
                  title="University"
                  description="Currently in university"
                />
                <EducationBadge
                  active={educationLevel === 'unaffiliated'}
                  icon={Building}
                  title="Unaffiliated"
                  description="Outside formal education"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving || !username.trim()}
                      className={`${buttonClassName} justify-center text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className={`${buttonClassName} justify-center text-sm font-semibold`}
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit profile
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 ei-card rounded-[28px] border border-white/10 p-6 sm:p-7">
          <SectionHeader
            eyebrow="Achievements"
            title="Badges earned from real work"
            description="This gallery stays connected to the same live badge data and detail modal."
          />
          <div className="mt-6">
            <BadgeGallery userId={profile.id} showTitle={false} />
          </div>
        </section>

        {isInstructorView ? (
          <section className="mt-6">
            <MentorAvailabilitySettings userId={profile.id} />
          </section>
        ) : null}
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

function SectionEyebrow({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
      {title}
    </p>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="space-y-2">
      <SectionEyebrow title={eyebrow} />
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-libre-franklin)] text-2xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-slate-300">
          {description}
        </p>
      </div>
    </div>
  )
}

function StatTile({ label, value, hint, icon: Icon }: StatItem) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {label}
          </p>
          <p className="font-[family-name:var(--font-libre-franklin)] text-3xl font-semibold text-white">
            {value}
          </p>
          <p className="text-sm text-slate-300">{hint}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function MiniMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-libre-franklin)] text-3xl font-semibold text-white">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-300">{hint}</p>
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
      <p className="text-sm font-semibold text-white">{title}</p>
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

function CompactList({
  title,
  items,
  emptyText,
}: {
  title: string
  items: Array<{ key: string; title: string; subtitle: string }>
  emptyText: string
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">{item.title}</p>
            <p className="mt-1 text-sm text-slate-400">{item.subtitle}</p>
          </div>
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

function EmptyPanel({
  text,
  href,
  cta,
}: {
  text: string
  href: string
  cta: string
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm leading-7 text-slate-300">{text}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function Field({ children }: { children: ReactNode }) {
  return <div className="space-y-1.5">{children}</div>
}

function EducationBadge({
  active,
  icon: Icon,
  title,
  description,
}: {
  active: boolean
  icon: typeof School
  title: string
  description: string
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 ${
        active
          ? 'border-white/25 bg-white/[0.08] text-white'
          : 'border-white/10 bg-white/[0.03] text-slate-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  )
}

function getPrimaryStats(
  dashboard: DashboardData | null,
  isInstructorView: boolean
): StatItem[] {
  if (!dashboard) {
    return [
      { label: 'Profile', value: '-', hint: 'Waiting for dashboard data', icon: Sparkles },
      { label: 'Maps', value: '-', hint: 'Waiting for dashboard data', icon: Compass },
      { label: 'Spaces', value: '-', hint: 'Waiting for dashboard data', icon: Users },
      { label: 'Practice', value: '-', hint: 'Waiting for dashboard data', icon: Brain },
    ]
  }

  if (isInstructorView) {
    return [
      {
        label: 'Classrooms',
        value: String(dashboard.classrooms.length),
        hint: 'Active memberships',
        icon: Layers3,
      },
      {
        label: 'Teams',
        value: String(dashboard.teams.length),
        hint: 'Across your spaces',
        icon: Users,
      },
      {
        label: 'Availability',
        value: String(dashboard.mentorAvailabilityDays),
        hint: 'Days configured',
        icon: Calendar,
      },
      {
        label: 'Reflection streak',
        value: String(dashboard.reflections.streak),
        hint: 'Recent presence',
        icon: Flame,
      },
    ]
  }

  return [
    {
      label: 'Active maps',
      value: String(dashboard.learningJourney.activeMapCount),
      hint: `${dashboard.learningJourney.averageProgressPercentage}% average progress`,
      icon: Compass,
    },
    {
      label: 'Next steps',
      value: String(dashboard.learningJourney.nextNodes.length),
      hint: 'Unlocked right now',
      icon: CheckCircle2,
    },
    {
      label: 'Classrooms',
      value: String(dashboard.classrooms.length),
      hint: 'Spaces you belong to',
      icon: BookOpen,
    },
    {
      label: 'Reflection streak',
      value: String(dashboard.reflections.streak),
      hint: 'Consecutive active days',
      icon: Flame,
    },
  ]
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
