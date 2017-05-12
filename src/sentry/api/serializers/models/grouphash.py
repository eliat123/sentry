from __future__ import absolute_import

from collections import defaultdict

from sentry.api.serializers import Serializer, register, serialize
from sentry.models import Event, GroupHash


def bulk_fetch_events_by_event_id(event_ids):
    return map(
        {
            event.event_id: event
            for event in
            Event.objects.filter(event_id__in=event_ids)
        }.get,
        event_ids,
    )


def get_latest_events(instances):
    keys = map(
        lambda i: (
            i.project_id,
            i.id,
        ),
        instances,
    )

    def collect(results, key):
        results[key[0]].append(key[1])
        return results

    projects = reduce(
        collect,
        keys,
        defaultdict(list),
    ).items()

    results = dict(
        map(
            lambda (project_id, group_hash_ids): (
                project_id,
                dict(
                    zip(
                        group_hash_ids,
                        bulk_fetch_events_by_event_id(
                            GroupHash.fetch_last_processed_event_id(
                                project_id,
                                group_hash_ids,
                            ),
                        ),
                    ),
                ),
            ),
            projects,
        )
    )

    return map(
        lambda (project_id, id): results[project_id][id],
        keys,
    )


@register(GroupHash)
class GroupHashSerializer(Serializer):
    def get_attrs(self, item_list, user, *args, **kwargs):
        events = serialize(
            get_latest_events(item_list),
            user=user,
        )
        return {
            item: {
                'latest_event': event
            } for item, event in zip(item_list, events)
        }

    def serialize(self, obj, attrs, user):
        return {
            'id': obj.hash,
            'latest_event': attrs['latest_event'],
        }
