/**
 * src/types/activity.ts
 * Real-time activity events broadcast via WebSocket.
 * The mock WS service emits these; real backend should match the same shape.
 */

import { TeamId } from './team';
import { PosterLayerItem } from './mural';

export type ActivityEventType =
  | 'layer:add'
  | 'layer:remove'
  | 'territory:update'
  | 'user:join'
  | 'user:leave';

export interface BaseActivityEvent {
  id: string;
  type: ActivityEventType;
  posterId: string;
  userId: string;
  username: string;
  teamId: TeamId;
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
  scores: Record<TeamId, number>;
  ownerTeamId: TeamId | null;
  heat: number;
}

export interface UserJoinEvent extends BaseActivityEvent {
  type: 'user:join';
}

export interface UserLeaveEvent extends BaseActivityEvent {
  type: 'user:leave';
}

export type ActivityEvent =
  | LayerAddEvent
  | LayerRemoveEvent
  | TerritoryUpdateEvent
  | UserJoinEvent
  | UserLeaveEvent;
