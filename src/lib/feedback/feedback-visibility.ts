import type { Prisma } from "@prisma/client";

import {
  resolveFeedbackReadScope,
  type AuthorizationActor,
} from "@/lib/authorization/access-control";

const NO_FEEDBACK_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Feedbacks an actor may read. The person being evaluated only sees a feedback
 * after it is submitted; the author always sees their own work, drafts included
 * (a self-assessment has the same person as subject and evaluator).
 */
export const visibilityWhere = (actor: AuthorizationActor): Prisma.FeedbackWhereInput => {
  const scope = resolveFeedbackReadScope(actor);
  const receivedAndSubmitted: Prisma.FeedbackWhereInput = {
    subjectPersonId: actor.personId,
    status: "SUBMITTED",
  };

  if (scope === "ALL") return {};
  if (scope === "SELF_AND_AUTHORED") {
    return { OR: [{ evaluatorPersonId: actor.personId }, receivedAndSubmitted] };
  }
  if (scope === "SELF") {
    return {
      OR: [
        { subjectPersonId: actor.personId, evaluatorPersonId: actor.personId },
        receivedAndSubmitted,
      ],
    };
  }
  return { id: NO_FEEDBACK_ID };
};
