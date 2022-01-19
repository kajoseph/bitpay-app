import React, {useEffect, useMemo} from 'react';
import Carousel from 'react-native-snap-carousel';
import {useDispatch, useSelector} from 'react-redux';
import {WIDTH} from '../../../../components/styled/Containers';
import {RootState} from '../../../../store';
import {CardEffects} from '../../../../store/card';
import {Card} from '../../../../store/card/card.models';
import {VirtualDesignCurrency} from '../../../../store/card/card.types';
import CardOverviewSlide from './CardOverviewSlide';

interface CardDashboardProps {}

const GroupEnabled = {
  firstView: false,
  galileo: true,
};

export class OverviewSlide {
  readonly provider: string;
  private readonly _cards: Card[] = [];

  get cards() {
    return this._cards;
  }

  get primaryCard() {
    return this._cards[0];
  }

  constructor(card: Card) {
    this.provider = card.provider;
    this._cards.push(card);
  }

  add(card: Card) {
    this._cards.push(card);
  }
}

const CardDashboard: React.FC<CardDashboardProps> = () => {
  const dispatch = useDispatch();
  const cards = useSelector<RootState, Card[]>(
    ({APP, CARD}) => CARD.cards[APP.network],
  );
  const virtualDesignCurrency = useSelector<RootState, VirtualDesignCurrency>(
    ({CARD}) => CARD.virtualDesignCurrency,
  );

  // TODO: this is a placeholder just to populate with some data
  // TODO: build a graph query to initialize everything, then do ad-hoc updates
  useEffect(() => {
    const card = cards.find(c => c.provider === 'galileo');

    if (card) {
      dispatch(CardEffects.startFetchOverview(card.id));
    }
  }, [cards, dispatch]);

  const memoizedSlides = useMemo(() => {
    // sort galileo before firstView, then virtual before physical
    const sortedCards = cards.sort((a, b) => {
      if (a.provider === 'galileo' && b.provider === 'firstView') {
        return -1;
      }
      if (a.provider === 'firstView' && b.provider === 'galileo') {
        return 1;
      }

      if (a.cardType === 'virtual' && b.cardType === 'physical') {
        return -1;
      }
      if (a.cardType === 'physical' && b.cardType === 'virtual') {
        return 1;
      }
      return 0;
    });

    const slides = sortedCards.reduce((slideList, card) => {
      if (!GroupEnabled[card.provider]) {
        slideList.push(new OverviewSlide(card));

        return slideList;
      }

      let slide = slideList.find(g => g.provider === card.provider);

      if (slide) {
        slide.add(card);
      } else {
        slideList.push(new OverviewSlide(card));
      }

      return slideList;
    }, [] as OverviewSlide[]);

    return slides;
  }, [cards]);

  return (
    <>
      <Carousel<OverviewSlide>
        vertical={false}
        layout="default"
        activeSlideAlignment="center"
        data={memoizedSlides}
        renderItem={({item}) => (
          <CardOverviewSlide
            slide={item}
            designCurrency={virtualDesignCurrency}
          />
        )}
        itemWidth={300 + 20}
        sliderWidth={WIDTH}
        inactiveSlideScale={1}
        inactiveSlideOpacity={1}
      />
    </>
  );
};

export default CardDashboard;