import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core'

import { FilterSetting } from '../../types/FilterSetting'
import { EnrichedChallenge } from '../../types/EnrichedChallenge'
import { filter } from 'rxjs/operators'

@Component({
  selector: 'challenges-unavailable-warning',
  templateUrl: './challenges-unavailable-warning.component.html',
  styleUrls: ['./challenges-unavailable-warning.component.scss']
})
export class ChallengesUnavailableWarningComponent implements OnChanges {
  @Input()
  public challenges: EnrichedChallenge[]

  @Input()
  public filterSetting: FilterSetting

  @Output()
  public filterSettingChange = new EventEmitter<FilterSetting>()

  public numberOfDisabledChallenges = 0
  public disabledBecauseOfEnv: string | null = null

  public ngOnChanges () {
    const disabledChallenges = this.challenges.filter(challenge => challenge.disabledEnv !== null)
    this.numberOfDisabledChallenges = disabledChallenges.length
    if (this.numberOfDisabledChallenges > 0) {
      this.disabledBecauseOfEnv = disabledChallenges[0].disabledEnv
    }
  }

  public toggleShowDisabledChallenges () {
    const filterSetting = {
      ...structuredClone(this.filterSetting),
      showDisabledChallenges: !this.filterSetting.showDisabledChallenges
    }
    this.filterSetting = filterSetting
    this.filterSettingChange.emit(filterSetting)
  }
}
