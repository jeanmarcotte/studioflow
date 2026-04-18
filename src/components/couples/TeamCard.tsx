import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TeamMember {
  role: string
  name: string
}

interface TeamCardProps {
  members: TeamMember[]
  confirmed: boolean
  contractNote?: string
}

export function TeamCard({ members, confirmed, contractNote }: TeamCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Team</CardTitle>
        {confirmed && <Badge className="bg-green-100 text-green-700">Confirmed</Badge>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {members.map((member) => (
            <div key={member.role} className="border rounded-lg p-3">
              <p className="text-xs font-medium text-teal-600 uppercase">{member.role}</p>
              <p className="text-sm text-gray-900">{member.name}</p>
            </div>
          ))}
        </div>
        {contractNote && (
          <p className="mt-3 text-xs text-blue-600">{contractNote}</p>
        )}
      </CardContent>
    </Card>
  )
}
