/**
 * src/types/activity.ts
 * Real-time activity events broadcast via Supabase Realtime.
 */

import { TeamId } from './team';
import { PosterLayerItem, StrokePoint } from './mural';

export type ActivityEventType =
  | 'layer:add'
  | 'layer:remove'
  | 'territory:update'
  | 'user:join'
  | 'user:leave'
  | 'stroke:live';       // ← linie în timp real, înainte de salvare

export interface BaseActivityEvent {
  id:        string;
  type:      ActivityEventType;
  posterId:  string;
  userId:    string;
  username:  string;
  teamId:    TeamId;
  timestamp: string;
}

export interface LayerAddEvent extends BaseActivityEvent {
  type: 'layer:add';
  item: PosterLayerItem;
}

export interface LayerRemoveEvent extends BaseActivityEvent {
  type: 'layer:remove';
  itemId: string;
}

export interface TerritoryUpdateEvent extends BaseActivityEvent {
  type: 'territory:update';
  scores:      Record<TeamId, number>;
  ownerTeamId: TeamId | null;
  heat:        number;
}

export interface UserJoinEvent extends BaseActivityEvent {
  type: 'user:join';
}

export interface UserLeaveEvent extends BaseActivityEvent {
  type: 'user:leave';
}

/**
 * StrokeLiveEvent — trimis continuu în timp ce utilizatorul desenează.
 *
 * `phase`:
 *   'start' → deget pus pe ecran (punctul inițial)
 *   'move'  → puncte noi de la ultima trimitere (delta, nu tot stroke-ul)
 *   'end'   → deget ridicat — stroke-ul live dispare (layer:add va urma)
 *
 * `strokeId` — identifică unic stroke-ul curent al unui utilizator.
 *   Format: `{userId}_{timestamp}` — simplu, fără librărie uuid.
 */
export interface StrokeLiveEvent extends BaseActivityEvent {
  type:        'stroke:live';
  strokeId:    string;
  phase:       'start' | 'move' | 'end';
  points:      StrokePoint[];   // delta — puncte noi de la ultimul pachet
  color:       string;
  strokeWidth: number;
  opacity:     number;
  toolType:    'brush' | 'spray' | 'glow' | 'erase';
}

export type ActivityEvent =
  | LayerAddEvent
  | LayerRemoveEvent
  | TerritoryUpdateEvent
  | UserJoinEvent
  | UserLeaveEvent
  | StrokeLiveEvent;
