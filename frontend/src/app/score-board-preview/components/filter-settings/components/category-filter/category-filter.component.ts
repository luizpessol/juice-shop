import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core'
import { EnrichedChallenge } from '../../../../types/EnrichedChallenge'
import { DEFAULT_FILTER_SETTING } from 'src/app/score-board-preview/types/FilterSetting'

@Component({
  selector: 'category-filter',
  templateUrl: './category-filter.component.html',
  styleUrls: ['./category-filter.component.scss']
})
export class CategoryFilterComponent implements OnInit, OnChanges {
  public availableCategories = new Set<string>()

  @Input()
  allChallenges: EnrichedChallenge[]

  @Input()
  categories: string[]

  @Output()
  categoriesChange = new EventEmitter<string[]>()

  ngOnInit () {
    this.availableCategories = CategoryFilterComponent.getAvailableCategories(this.allChallenges)
  }

  ngOnChanges () {
    this.availableCategories = CategoryFilterComponent.getAvailableCategories(this.allChallenges)
  }

  public static getAvailableCategories (allChallenges: EnrichedChallenge[]) {
    return new Set(allChallenges.map((challenge) => challenge.category))
  }

  public toggleCategorySelected (category: string) {
    if (this.isCategorySelected(category)) {
      this.categories = this.categories.filter((c) => c !== category)
    } else {
      this.categories.push(category)
    }
    this.categoriesChange.emit(this.categories)
  }

  public isCategorySelected (category: string) {
    return this.categories.includes(category)
  }

  public isAllCategoriesSelected () {
    return (this.categories.length === 0)
  }

  public resetCategoryFilter () {
    this.categories = DEFAULT_FILTER_SETTING.categories
    this.categoriesChange.emit(this.categories)
  }
}
