import { Participant } from '@routes/login';
export default function canDoModerationOperationOnTarget(
    requestingParticipant: Participant,
    targetParticipant: Participant,
) {
    if (!requestingParticipant.moderator) return false;
    if (requestingParticipant.id == targetParticipant.id) return false;
    if (requestingParticipant.owner) return true;
    if (requestingParticipant.moderator && targetParticipant.moderator) return false;
    return true;
}
