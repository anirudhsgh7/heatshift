export const ACTIVITIES = [
  { id: 'walking', label: 'Walking', typical: 1 },
  { id: 'cycling', label: 'Cycling', typical: 1 },
  { id: 'exercise', label: 'Outdoor exercise', typical: 2 },
  { id: 'delivery', label: 'Delivery work', typical: 4 },
  { id: 'gardening', label: 'Gardening', typical: 2 },
  { id: 'custom', label: 'Custom task', typical: null },
]

export const DEFAULT_ACTIVITY = 'exercise'

export function activityPatch(activity) {
  const patch = { activity: activity.id }
  if (activity.typical) patch.duration = activity.typical
  return patch
}
