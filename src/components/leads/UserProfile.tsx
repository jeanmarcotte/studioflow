'use client';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function UserProfile() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left outline-none">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-[#0d4f4f] text-white text-sm font-medium">
            JM
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Jean Marcotte</p>
          <p className="text-xs text-muted-foreground truncate">jeanmarcotte@gmail.com</p>
        </div>
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
