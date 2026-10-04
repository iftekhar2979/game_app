import {
  isCommunityNotification,
  type NotificationItem,
} from '../src/store/api/notificationApi';

const notification = (metadata: NotificationItem['metadata']): NotificationItem => ({
  _id: 'n1',
  recipientId: 'player',
  category: 'social',
  title: 'Update',
  body: 'Update body',
  isRead: false,
  createdAt: '2026-10-04T00:00:00.000Z',
  metadata,
});

it('hides public-post notices while preserving private league chat notices', () => {
  expect(isCommunityNotification(notification({ reason: 'social_post_comment' }))).toBe(true);
  expect(isCommunityNotification(notification({ screen: 'PostDetails' }))).toBe(true);
  expect(isCommunityNotification(notification({
    screen: 'LeagueChat',
    reason: 'league_chat:message-1',
  }))).toBe(false);
});
