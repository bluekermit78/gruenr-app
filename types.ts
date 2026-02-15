
export type UserRole = 'admin' | 'moderator' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  joinedAt: number;
  isVerified: boolean;
  organization?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  createdAt: number;
}

export type TreeSuggestionStatus = 'Vorschlag' | 'Akzeptiert' | 'In Arbeit' | 'Gepflanzt' | 'Abgelehnt';

export interface TreeSuggestion {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  images?: string[];
  votes: number; // Net score: upvotes - downvotes
  upVotedBy: string[];
  downVotedBy: string[];
  comments: Comment[];
  authorId: string;
  authorName: string;
  createdAt: number;
  status: TreeSuggestionStatus;
}

export interface Highlight {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  images: string[];
  authorId: string;
  createdAt: number;
}

export type DamageReportStatus = 'Gemeldet' | 'In Arbeit' | 'Erledigt';

export interface DamageReport {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  images?: string[];
  status: DamageReportStatus;
  authorId: string;
  authorName: string;
  createdAt: number;
  moderatorComment?: string;
  moderatorName?: string;
  moderatorOrg?: string;
}

export type ViewMode = 'map' | 'list' | 'profile' | 'reports' | 'highlights';
