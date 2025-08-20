'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Save, User, Mail, Calendar, Edit } from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  username: string
  avatar_url: string | null
  date_of_birth: string | null
  discord_id: string | null
  created_at: string | null
  updated_at: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const supabase = createClient()

  // Form states
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [discordId, setDiscordId] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const createProfile = async (user: any) => {
    try {
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          username: user.user_metadata?.preferred_username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select('*')
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        toast.error('Failed to create profile')
        return
      }

      setProfile(newProfile)
      setFullName(newProfile.full_name || '')
      setUsername(newProfile.username || '')
      setDateOfBirth(newProfile.date_of_birth || '')
      setDiscordId(newProfile.discord_id || '')
      toast.success('Profile created successfully!')
    } catch (error) {
      console.error('Profile creation error:', error)
      toast.error('Failed to create profile')
    }
  }

  const fetchProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error('Please log in to view your profile')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist, create one
          await createProfile(user)
        } else {
          console.error('Error fetching profile:', profileError)
          toast.error('Failed to load profile')
        }
        return
      }

      setProfile(profileData)
      setFullName(profileData.full_name || '')
      setUsername(profileData.username || '')
      setDateOfBirth(profileData.date_of_birth || '')
      setDiscordId(profileData.discord_id || '')
    } catch (error) {
      console.error('Profile fetch error:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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

      // Update local state with new avatar URL
      setProfile(prev => prev ? { ...prev, avatar_url: result.fileUrl } : null)
      toast.success('Avatar updated successfully!')
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          username: username,
          date_of_birth: dateOfBirth || null,
          discord_id: discordId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) {
        throw new Error('Failed to update profile')
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        full_name: fullName || null,
        username,
        date_of_birth: dateOfBirth || null,
        discord_id: discordId || null,
        updated_at: new Date().toISOString(),
      } : null)

      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Profile save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (profile) {
      setFullName(profile.full_name || '')
      setUsername(profile.username || '')
      setDateOfBirth(profile.date_of_birth || '')
      setDiscordId(profile.discord_id || '')
    }
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-24 w-24 bg-gray-300 rounded-full mx-auto"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p>Profile not found. Please try logging out and back in.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="relative inline-block">
              <Avatar className="h-24 w-24 mx-auto">
                <AvatarImage 
                  src={profile.avatar_url || '/placeholder-user.jpg'} 
                  alt="Profile picture" 
                />
                <AvatarFallback className="text-2xl">
                  {profile.full_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full cursor-pointer transition-colors"
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
            
            <CardTitle className="mt-4">
              {isEditing ? 'Edit Profile' : (profile.full_name || profile.username)}
            </CardTitle>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {profile.email}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {uploading && (
              <div className="text-center text-sm text-muted-foreground">
                Uploading avatar...
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discordId">Discord Username</Label>
                <Input
                  id="discordId"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter your Discord username"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={saving || !username.trim()}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>

            {profile.created_at && (
              <div className="text-sm text-muted-foreground text-center pt-4 border-t">
                <Calendar className="h-4 w-4 inline mr-2" />
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}