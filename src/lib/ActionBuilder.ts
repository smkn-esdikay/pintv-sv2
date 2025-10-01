import { cnsActions, type ActionEntry } from '@/constants/wrestling.constants';
import type { WAction, WSide } from '@/types';
import { generateId } from './math';

export class ActionBuilder {

  static buildSystemAction(
    code: ActionEntry['code'], side: WSide, pointOverride?: number, elapsed?: number
  ): WAction | undefined {
    const actnData = cnsActions.System.find(el => el.code === code);
    if (!actnData)
      return undefined;

    const pt = pointOverride ?? actnData.points?.[0] ?? 0;

    const actn: WAction = {
      id: generateId(),
      wrestle: {
        side,
        action: actnData.code,
        actionTitle: actnData.title,
        clean: true,
        pt,
        oppPt: 0,
        dq: false,
      },
      ts: Date.now(),
    };
    if (elapsed)
      actn.elapsed = elapsed;

    return actn;
  }

} // class
