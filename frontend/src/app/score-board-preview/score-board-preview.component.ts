import { combineLatest } from 'rxjs'
import { MatDialog } from '@angular/material/dialog'
import { DomSanitizer } from '@angular/platform-browser'
import { ActivatedRoute, Router } from '@angular/router'
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core'

import { SocketIoService } from '../Services/socket-io.service'
import { ChallengeService } from '../Services/challenge.service'
import { CodeSnippetService } from '../Services/code-snippet.service'
import { CodeSnippetComponent } from '../code-snippet/code-snippet.component'
import { Config, ConfigurationService } from '../Services/configuration.service'

import { EnrichedChallenge } from './types/EnrichedChallenge'
import { DEFAULT_FILTER_SETTING, FilterSetting } from './types/FilterSetting'

import { filterChallenges } from './helpers/challenge-filtering'
import { sortChallenges } from './helpers/challenge-sorting'
import { fromQueryParams, toQueryParams } from './helpers/query-params-converters'

interface ChallengeSolvedWebsocket {
  key: string
  name: string
  challenge: string
  flag: string
  hidden: boolean
  isRestore: boolean
}

@Component({
  selector: 'score-board-preview',
  templateUrl: './score-board-preview.component.html',
  styleUrls: ['./score-board-preview.component.scss']
})
export class ScoreBoardPreviewComponent implements OnInit, OnDestroy {
  public allChallenges: EnrichedChallenge[] = []
  public filteredChallenges: EnrichedChallenge[] = []
  public filterSetting: FilterSetting = structuredClone(DEFAULT_FILTER_SETTING)
  public applicationConfiguration: Config | null = null

  constructor (
    private readonly challengeService: ChallengeService,
    private readonly codeSnippetService: CodeSnippetService,
    private readonly configurationService: ConfigurationService,
    private readonly sanitizer: DomSanitizer,
    private readonly ngZone: NgZone,
    private readonly io: SocketIoService,
    private readonly dialog: MatDialog,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) { }

  ngOnInit () {
    console.time('ScoreBoardPreview - load challenges')
    combineLatest([
      this.challengeService.find({ sort: 'name' }),
      this.codeSnippetService.challenges(),
      this.configurationService.getApplicationConfiguration()
    ]).subscribe(([challenges, challengeKeysWithCodeChallenges, applicationConfiguration]) => {
      console.timeEnd('ScoreBoardPreview - load challenges')
      this.applicationConfiguration = applicationConfiguration

      console.time('ScoreBoardPreview - transform challenges')
      const transformedChallenges = challenges.map((challenge) => {
        return {
          ...challenge,
          tagList: challenge.tags ? challenge.tags.split(',').map((tag) => tag.trim()) : [],
          originalDescription: challenge.description as string,
          description: this.sanitizer.bypassSecurityTrustHtml(challenge.description as string),
          difficultyAsList: [...Array(challenge.difficulty).keys()],
          hasCodingChallenge: challengeKeysWithCodeChallenges.includes(challenge.key)
        }
      })
      this.allChallenges = transformedChallenges
      this.filterAndUpdateChallenges()
      console.timeEnd('ScoreBoardPreview - transform challenges')
    })

    this.route.queryParams.subscribe((queryParams) => {
      this.filterSetting = fromQueryParams(queryParams)
      this.filterAndUpdateChallenges()
    })

    this.io.socket().on('challenge solved', this.onChallengeSolvedWebsocket.bind(this))
  }

  ngOnDestroy (): void {
    this.io.socket().off('challenge solved', this.onChallengeSolvedWebsocket.bind(this))
  }

  onFilterSettingUpdate (filterSetting: FilterSetting) {
    this.router.navigate([], {
      queryParams: toQueryParams(filterSetting)
    })
  }

  onChallengeSolvedWebsocket (data?: ChallengeSolvedWebsocket) {
    console.log('ScoreBoardPreview - challenge solved', data)
    if (!data) {
      return
    }

    const allChallenges = this.allChallenges.map((challenge) => {
      if (challenge.key === data.key) {
        console.log('ScoreBoardPreview - updating challenge', data.key)
        return {
          ...challenge,
          solved: true
        }
      }
      return { ...challenge }
    })
    this.allChallenges = [...allChallenges]
    this.filterAndUpdateChallenges()
    // manually trigger angular change detection... :(
    // unclear why this is necessary, possibly because the socket.io callback is not running inside angular
    this.ngZone.run(() => {})
  }

  filterAndUpdateChallenges (): void {
    this.filteredChallenges = sortChallenges(
      filterChallenges(this.allChallenges, {
        ...this.filterSetting,
        restrictToTutorialChallengesFirst: this.applicationConfiguration?.challenges?.restrictToTutorialsFirst ?? true
      })
    )
  }

  // angular helper to speed up challenge rendering
  getChallengeKey (index: number, challenge: EnrichedChallenge): string {
    return challenge.key
  }

  reset () {
    this.router.navigate([], {
      queryParams: toQueryParams(DEFAULT_FILTER_SETTING)
    })
  }

  openCodingChallengeDialog (challengeKey: string) {
    const challenge = this.allChallenges.find((challenge) => challenge.key === challengeKey)

    const dialogRef = this.dialog.open(CodeSnippetComponent, {
      disableClose: true,
      data: {
        key: challengeKey,
        name: challenge.name,
        codingChallengeStatus: challenge.codingChallengeStatus
      }
    })

    dialogRef.afterClosed().subscribe(result => {
      const challenge = this.allChallenges.find((challenge) => challenge.key === challengeKey)
      if (challenge.codingChallengeStatus < 1) {
        challenge.codingChallengeStatus = result.findIt ? 1 : challenge.codingChallengeStatus
      }
      if (challenge.codingChallengeStatus < 2) {
        challenge.codingChallengeStatus = result.fixIt ? 2 : challenge.codingChallengeStatus
      }
      this.filterAndUpdateChallenges()
    })
  }

  async repeatChallengeNotification (challengeKey: string) {
    const challenge = this.allChallenges.find((challenge) => challenge.key === challengeKey)
    await this.challengeService.repeatNotification(encodeURIComponent(challenge.name)).toPromise()
  }
}
