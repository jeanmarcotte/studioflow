'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Circle } from 'lucide-react'

interface Milestone {
  key: string
  label: string
  completed: boolean
}

interface Phase {
  id: string
  title: string
  milestones: Milestone[]
}

interface ClientJourneyProps {
  phases: Phase[]
  totalMilestones: number
  completedMilestones: number
}

export function ClientJourney({ phases, totalMilestones, completedMilestones }: ClientJourneyProps) {
  const progress = (completedMilestones / totalMilestones) * 100

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 gap-1">
        <CardTitle className="text-lg font-semibold text-slate-900">Client Journey</CardTitle>
        <span className="text-xs md:text-sm text-slate-500">
          {Math.round(progress)}% complete — {completedMilestones} of {totalMilestones} milestones
        </span>
      </CardHeader>
      <CardContent>
        {/* Animated Progress Bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
          <motion.div
            className="h-full bg-slate-700"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        {/* Phase Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {phases.map((phase, phaseIndex) => {
            const phaseCompleted = phase.milestones.filter(m => m.completed).length
            const phaseTotal = phase.milestones.length

            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: phaseIndex * 0.1, duration: 0.4 }}
                className="border border-slate-100 rounded-lg p-4 bg-slate-50/50"
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {phase.title}
                  </h4>
                  <span className="text-xs text-slate-400">
                    {phaseCompleted} of {phaseTotal}
                  </span>
                </div>

                <ul className="space-y-2">
                  {phase.milestones.map((milestone, milestoneIndex) => (
                    <motion.li
                      key={milestone.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: phaseIndex * 0.1 + milestoneIndex * 0.05, duration: 0.3 }}
                      className="flex items-center gap-2"
                    >
                      {milestone.completed ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                      <span className={`text-sm ${milestone.completed ? 'text-slate-700' : 'text-slate-400'}`}>
                        {milestone.label}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
