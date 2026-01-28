"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgendaItem } from '@/components/AgendaItem'
import {
  createAgendaItem,
  toggleAgendaItem,
  deleteAgendaItem,
  startMeetingSession,
  endMeetingSession,
  updateMemberProfile,
} from '@/lib/db-operations'
import type { TeamMember, AgendaItem as AgendaItemType, MeetingSession, MemberProfile } from '@/lib/db.types'
import { Play, Square, Sparkles, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

function getLocalISODateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface MemberDetailClientProps {
  teamId: string
  teamName: string
  initialMember: TeamMember & { agenda_items: AgendaItemType[]; meeting_sessions: MeetingSession[] }
  initialMeetingAgendaItems: AgendaItemType[]
  initialTab?: 'agenda' | 'profile'
}

export default function MemberDetailClient({
  teamId,
  teamName,
  initialMember,
  initialMeetingAgendaItems,
  initialTab = 'agenda',
}: MemberDetailClientProps) {
  const router = useRouter()

  const [member, setMember] = useState(initialMember)
  const [meetingAgendaItems, setMeetingAgendaItems] = useState<AgendaItemType[]>(initialMeetingAgendaItems)
  const [error, setError] = useState<string | null>(null)
  const [newAgendaContent, setNewAgendaContent] = useState('')
  const [newAgendaDate, setNewAgendaDate] = useState<string>('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [showFuture, setShowFuture] = useState(false)

  // Tab and Profile state
  const [activeTab, setActiveTab] = useState<'agenda' | 'profile'>(initialTab)
  const [profileInput, setProfileInput] = useState(member.profile_raw_input || '')
  const [isExtractingProfile, setIsExtractingProfile] = useState(false)
  const [extractedProfile, setExtractedProfile] = useState<MemberProfile | null>(
    member.role || member.current_focus || member.growth_goals || member.one_on_one_themes || member.feedback_preferences
      ? {
          role: member.role,
          current_focus: member.current_focus,
          growth_goals: member.growth_goals,
          one_on_one_themes: member.one_on_one_themes,
          feedback_preferences: member.feedback_preferences,
        }
      : null
  )
  const [editingProfile, setEditingProfile] = useState<MemberProfile | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const hasProfile = Boolean(member.role || member.current_focus || member.growth_goals)

  const isMeetingActive = (member.meeting_sessions || []).some((session) => session.ended_at == null)

  const agendaItems = member.agenda_items || []
  const today = getLocalISODateString()
  const relevantNowOpenItems = agendaItems.filter((item) => {
    if (item.completed) return false
    if (!item.scheduled_date) return true
    return item.scheduled_date <= today
  })
  const futureOpenItems = agendaItems.filter((item) => {
    if (item.completed) return false
    if (!item.scheduled_date) return false
    return item.scheduled_date > today
  })

  const handleAddAgendaItem = async () => {
    if (isAddingItem) {
      if (newAgendaContent.trim()) {
        try {
          setError(null)
          const newItem = await createAgendaItem(member.id, newAgendaContent.trim(), newAgendaDate || null)
          setMember({
            ...member,
            agenda_items: [newItem, ...member.agenda_items],
          })

          if (isMeetingActive) {
            setMeetingAgendaItems([newItem, ...meetingAgendaItems])
          }

          setNewAgendaContent('')
          setNewAgendaDate('')
          setIsAddingItem(false)
          router.refresh()
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to create agenda item')
          console.error('Error creating agenda item:', err)
        }
      }
    } else {
      setIsAddingItem(true)
    }
  }

  const handleCancelAdd = () => {
    setIsAddingItem(false)
    setNewAgendaContent('')
    setNewAgendaDate('')
  }

  const handleUpdateAgendaItem = async (updatedItem: AgendaItemType) => {
    setMember({
      ...member,
      agenda_items: member.agenda_items.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      ),
    })

    setMeetingAgendaItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    )
  }

  const handleToggleAgendaItem = async (id: string, completed: boolean) => {
    try {
      setError(null)
      await toggleAgendaItem(id, completed)
      setMember({
        ...member,
        agenda_items: member.agenda_items.map((item) =>
          item.id === id ? { ...item, completed } : item
        ),
      })

      setMeetingAgendaItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, completed } : item))
      )

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agenda item')
      console.error('Error updating agenda item:', err)
    }
  }

  const handleDeleteAgendaItem = async (id: string) => {
    try {
      setError(null)
      await deleteAgendaItem(id)
      setMember({
        ...member,
        agenda_items: member.agenda_items.filter((item) => item.id !== id),
      })

      setMeetingAgendaItems((prev) => prev.filter((item) => item.id !== id))

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agenda item')
      console.error('Error deleting agenda item:', err)
    }
  }

  const handleStartMeeting = async () => {
    try {
      setError(null)
      const newSession = await startMeetingSession(member.id)
      setMember({
        ...member,
        meeting_sessions: [newSession, ...(member.meeting_sessions || [])],
      })

      const items = relevantNowOpenItems
      setMeetingAgendaItems(items)
      setShowFuture(false)

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start meeting')
      console.error('Error starting meeting:', err)
    }
  }

  const handleEndMeeting = async () => {
    try {
      setError(null)
      const endedSession = await endMeetingSession(member.id)
      setMember({
        ...member,
        meeting_sessions: (member.meeting_sessions || []).map((s) =>
          s.id === endedSession.id ? endedSession : s
        ),
      })

      setMeetingAgendaItems([])
      setShowFuture(false)

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end meeting')
      console.error('Error ending meeting:', err)
    }
  }

  const handleExtractProfile = async () => {
    if (!profileInput.trim()) return

    try {
      setIsExtractingProfile(true)
      setError(null)

      const response = await fetch('/api/profile/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: profileInput }),
      })

      if (!response.ok) {
        throw new Error('Failed to extract profile')
      }

      const profile = await response.json()
      setExtractedProfile(profile)
      setEditingProfile(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract profile')
      console.error('Error extracting profile:', err)
    } finally {
      setIsExtractingProfile(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!editingProfile) return

    try {
      setIsSavingProfile(true)
      setError(null)

      const updatedMember = await updateMemberProfile(member.id, {
        ...editingProfile,
        profile_raw_input: profileInput,
      })

      setMember({
        ...member,
        ...updatedMember,
      })
      setExtractedProfile(editingProfile)
      setEditingProfile(null)

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
      console.error('Error saving profile:', err)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleCancelProfileEdit = () => {
    setEditingProfile(null)
    if (extractedProfile) {
      // Keep extracted profile visible
    }
  }

  return (
    <div className={`min-h-screen bg-background ${isMeetingActive ? 'ring-4 ring-inset ring-[#F11E7D] shadow-[inset_0_0_20px_rgba(241,30,125,0.2)]' : ''}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href={`/teams/${teamId}`}>
            <Button variant="ghost" className="mb-4">
              ← Back to {teamName}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold">{member.name}</h1>
            {isMeetingActive ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEndMeeting}
                aria-label="End meeting"
                title="End meeting"
                className="text-[#F11E7D]"
              >
                <Square />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStartMeeting}
                aria-label="Start meeting"
                title="Start meeting"
              >
                <Play />
              </Button>
            )}
          </div>
          {isMeetingActive && (
            <p className="text-[#F11E7D] font-medium mt-1">Meeting in progress</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              activeTab === 'agenda'
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Agenda
            {activeTab === 'agenda' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              activeTab === 'profile'
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Profile
            {hasProfile && activeTab !== 'profile' && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-primary rounded-full" />
            )}
            {activeTab === 'profile' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        </div>

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Guiding Questions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Describe this person. Consider:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>What are they working on right now?</li>
                <li>What do you want to help them achieve?</li>
                <li>What should 1:1s focus on with this person?</li>
              </ul>
            </div>

            {/* Text Input */}
            <div className="space-y-3">
              <textarea
                value={profileInput}
                onChange={(e) => setProfileInput(e.target.value)}
                placeholder="E.g., Sarah is a senior engineer leading the checkout redesign. She's been with us for 2 years and wants to move into a tech lead role. She prefers direct feedback and likes to discuss technical challenges in our 1:1s..."
                className="w-full min-h-[140px] p-3 rounded-md border bg-background text-sm resize-y"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExtractProfile}
                  disabled={!profileInput.trim() || isExtractingProfile}
                  className="relative inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                  style={{
                    background: 'transparent',
                    border: '2px solid transparent',
                    backgroundImage: 'linear-gradient(var(--background), var(--background)), linear-gradient(135deg, #FFFFFF 0%, #F11E7D 7%, #781EF8 53%, #0D00FB 81%)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                >
                  <span
                    className="inline-flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #F11E7D 7%, #781EF8 53%, #0D00FB 81%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    <Sparkles className="h-4 w-4" style={{ fill: 'url(#sparkle-gradient)' }} />
                    {isExtractingProfile ? 'Extracting...' : 'Extract Profile'}
                  </span>
                  <svg width="0" height="0" className="absolute">
                    <defs>
                      <linearGradient id="sparkle-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="7%" stopColor="#F11E7D" />
                        <stop offset="53%" stopColor="#781EF8" />
                        <stop offset="81%" stopColor="#0D00FB" />
                      </linearGradient>
                    </defs>
                  </svg>
                </button>
                {hasProfile && (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full border text-muted-foreground cursor-help"
                    title="Extracting will overwrite your current profile with new AI-generated fields based on your description above."
                  >
                    <Info className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>

            {/* Extracted/Editing Profile */}
            {(editingProfile || extractedProfile) && (
              <div
                className="rounded-lg p-5 space-y-4 border-2"
                style={{ borderColor: '#5D5FEF' }}
              >
                <h3 className="font-medium">
                  {editingProfile ? 'Review & Edit Profile' : 'Current Profile'}
                </h3>

                {editingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Role</label>
                      <Input
                        value={editingProfile.role || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, role: e.target.value || null })}
                        placeholder="e.g., Senior Engineer"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Current Focus</label>
                      <textarea
                        value={editingProfile.current_focus || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, current_focus: e.target.value || null })}
                        placeholder="What are they working on?"
                        className="w-full mt-1 p-2 rounded-md border bg-background text-sm resize-y min-h-[80px]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Growth Goals</label>
                      <textarea
                        value={editingProfile.growth_goals || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, growth_goals: e.target.value || null })}
                        placeholder="What do you want to help them achieve?"
                        className="w-full mt-1 p-2 rounded-md border bg-background text-sm resize-y min-h-[80px]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">1:1 Themes</label>
                      <textarea
                        value={editingProfile.one_on_one_themes || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, one_on_one_themes: e.target.value || null })}
                        placeholder="What should 1:1s focus on?"
                        className="w-full mt-1 p-2 rounded-md border bg-background text-sm resize-y min-h-[80px]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Feedback Preferences</label>
                      <textarea
                        value={editingProfile.feedback_preferences || ''}
                        onChange={(e) => setEditingProfile({ ...editingProfile, feedback_preferences: e.target.value || null })}
                        placeholder="How do they prefer feedback?"
                        className="w-full mt-1 p-2 rounded-md border bg-background text-sm resize-y min-h-[80px]"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                        {isSavingProfile ? 'Saving...' : 'Save Profile'}
                      </Button>
                      <Button variant="ghost" onClick={handleCancelProfileEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : extractedProfile ? (
                  <div className="space-y-4">
                    {extractedProfile.role && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Role</p>
                        <p className="text-sm mt-0.5">{extractedProfile.role}</p>
                      </div>
                    )}
                    {extractedProfile.current_focus && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Current Focus</p>
                        <p className="text-sm mt-0.5">{extractedProfile.current_focus}</p>
                      </div>
                    )}
                    {extractedProfile.growth_goals && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Growth Goals</p>
                        <p className="text-sm mt-0.5">{extractedProfile.growth_goals}</p>
                      </div>
                    )}
                    {extractedProfile.one_on_one_themes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">1:1 Themes</p>
                        <p className="text-sm mt-0.5">{extractedProfile.one_on_one_themes}</p>
                      </div>
                    )}
                    {extractedProfile.feedback_preferences && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Feedback Preferences</p>
                        <p className="text-sm mt-0.5">{extractedProfile.feedback_preferences}</p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProfile(extractedProfile)}
                      className="mt-2"
                    >
                      Edit Profile
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Agenda Tab Content */}
        {activeTab === 'agenda' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Agenda Items</h2>
              {!isAddingItem && (
                <Button variant="outline" onClick={handleAddAgendaItem}>
                  + Add Item
                </Button>
              )}
            </div>

            {isAddingItem && (
              <div className="mb-4 space-y-2 p-4 border rounded-lg bg-card">
                <Input
                  placeholder="Enter agenda item..."
                  value={newAgendaContent}
                  onChange={(e) => setNewAgendaContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddAgendaItem()
                    } else if (e.key === 'Escape') {
                      handleCancelAdd()
                    }
                  }}
                  autoFocus
                  className="w-full"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Schedule for:</label>
                  <Input
                    type="date"
                    value={newAgendaDate}
                    onChange={(e) => setNewAgendaDate(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleAddAgendaItem}
                    disabled={!newAgendaContent.trim()}
                  >
                    Add
                  </Button>
                  <Button variant="ghost" onClick={handleCancelAdd}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {isMeetingActive ? (
                meetingAgendaItems.length === 0 ? (
                  <p className="text-muted-foreground">No agenda items in this meeting</p>
                ) : (
                  meetingAgendaItems.map((item) => (
                    <AgendaItem
                      key={item.id}
                      item={item}
                      onToggle={handleToggleAgendaItem}
                      onDelete={handleDeleteAgendaItem}
                      onUpdate={handleUpdateAgendaItem}
                    />
                  ))
                )
              ) : (
                <>
                  {relevantNowOpenItems.length === 0 && !isAddingItem ? (
                    <p className="text-muted-foreground">No agenda items due today</p>
                  ) : (
                    relevantNowOpenItems.map((item) => (
                      <AgendaItem
                        key={item.id}
                        item={item}
                        onToggle={handleToggleAgendaItem}
                        onDelete={handleDeleteAgendaItem}
                        onUpdate={handleUpdateAgendaItem}
                      />
                    ))
                  )}

                  {futureOpenItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowFuture((v) => !v)}
                      className="mt-4 text-sm text-muted-foreground hover:underline"
                    >
                      {showFuture
                        ? 'Hide future items'
                        : `See future items${futureOpenItems.length ? ` (${futureOpenItems.length})` : ''}`}
                    </button>
                  )}

                  {showFuture && futureOpenItems.length > 0 && (
                    <div className="pt-4 mt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Future:</p>
                      {futureOpenItems.map((item) => (
                        <AgendaItem
                          key={item.id}
                          item={item}
                          onToggle={handleToggleAgendaItem}
                          onDelete={handleDeleteAgendaItem}
                          onUpdate={handleUpdateAgendaItem}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
