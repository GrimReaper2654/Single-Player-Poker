import random
from collections import Counter
from tqdm import tqdm

HEARTS = 'hearts'
CLUBS = 'clubs'
DIAMONDS = 'diamonds'
SPADES = 'spades'

SIMS = 100000
VERBOSE_LOGGING = 0
SUITS = [HEARTS, CLUBS, DIAMONDS, SPADES]
ALL_CARDS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
HAND_RANKINGS = {
    "High Card": 1,
    "One Pair": 2,
    "Two Pair": 3,
    "Three of a Kind": 4,
    "Straight": 5,
    "Flush": 6,
    "Full House": 7,
    "Four of a Kind": 8,
    "Straight Flush": 9,
    "Royal Flush": 10
}

win = 0
loss = 0
total_dealer_cards = 0
cards = []

class Card:
    def __init__(self, card, suit):
        self.suit = suit
        self.card = card
        self.is_red = suit in [HEARTS, DIAMONDS]
        self.isPicture = card in ['J', 'Q', 'K', 'A']

    def get_value(self):
        if self.card in ['J', 'Q', 'K']:
            return 11 + ['J', 'Q', 'K'].index(self.card)  # J=11, Q=12, K=13
        elif self.card == 'A':
            return 14  # Ace is highest in poker
        return int(self.card)
    
    def __eq__(self, other): 
        if not isinstance(other, Card):
            # don't attempt to compare against unrelated types
            return NotImplemented

        return self.suit == other.suit and self.card == other.card

class Strats:
    def flush_only(my_cards, opponent_cards):
        if len(my_cards) == 0:
            return cards
        else:
            return [c for c in cards if c.suit == my_cards[0].suit]

def evaluate_hand(deck):
    values = sorted([card.get_value() for card in deck], reverse=True)
    SUITS = [card.suit for card in deck]
    value_counts = Counter(values)
    suit_counts = Counter(SUITS)

    is_flush = max(suit_counts.values()) >= 5
    is_straight = any(
        all(v - i in values for i in range(5)) for v in values
    )

    if is_flush and is_straight:
        return ("Royal Flush", values) if 10 in values and 14 in values else ("Straight Flush", values)
    if 4 in value_counts.values():
        return "Four of a Kind", sorted(values, key=lambda v: (value_counts[v], v), reverse=True)
    if 3 in value_counts.values() and 2 in value_counts.values():
        return "Full House", sorted(values, key=lambda v: (value_counts[v], v), reverse=True)
    if is_flush:
        return "Flush", values
    if is_straight:
        return "Straight", values
    if 3 in value_counts.values():
        return "Three of a Kind", sorted(values, key=lambda v: (value_counts[v], v), reverse=True)
    if list(value_counts.values()).count(2) == 2:
        return "Two Pair", sorted(values, key=lambda v: (value_counts[v], v), reverse=True)
    if 2 in value_counts.values():
        return "One Pair", sorted(values, key=lambda v: (value_counts[v], v), reverse=True)
    
    return "High Card", values

def get_hand_value(deck):
    hand_type, sorted_values = evaluate_hand(deck)
    base_value = HAND_RANKINGS[hand_type]

    return (base_value, sorted_values)  # Higher values are better for sorting

for s in SUITS:
    for n in ALL_CARDS:
        cards.append(Card(n, s))

def want_card(my_cards, opponent_cards):
    return Strats.flush_only(my_cards, opponent_cards)

def play(i):
    global win
    global loss
    global total_dealer_cards
    my_cards = []
    dealer_cards = []
    wanted = want_card(my_cards, dealer_cards)
    random.shuffle(cards)

    for c in cards:
        if VERBOSE_LOGGING > 1: print(f'GAME {i}: Drawed {c.card} of {c.suit}.')
        if len(my_cards) < 5 and c in wanted:
            my_cards.append(c)
            wanted = want_card(my_cards, dealer_cards)
            if VERBOSE_LOGGING > 1: print(f'GAME {i}: Player takes card.')
        else:
            dealer_cards.append(c)
            if VERBOSE_LOGGING > 1: print(f'GAME {i}: Dealer takes card.')
            total_dealer_cards += 1
        
        if len(my_cards) == 5 and len(dealer_cards) >= 8:
            break
    
    if get_hand_value(my_cards) > get_hand_value(dealer_cards):
        if VERBOSE_LOGGING: print(f'GAME {i}: Player wins with {evaluate_hand(my_cards)[0]} over dealer\'s {evaluate_hand(dealer_cards)[0]}.')
        win += 1
    else:
        if VERBOSE_LOGGING: print(f'GAME {i}: Dealer wins with {evaluate_hand(dealer_cards)[0]} over player\'s {evaluate_hand(my_cards)[0]}.')
        loss += 1

    if VERBOSE_LOGGING: print(f'Player w/l: {win}/{loss} = {round(win/(win+loss)*100,2)}% winrate')

from tqdm import tqdm

class CustomTQDM(tqdm):
    def display(self, msg=None, pos=None):
        if msg is None:
            msg = self.__str__()  # Get the current bar string
        
        # Modify the bar string (e.g., remove the extra comma)
        msg = msg.replace(", ", " ") + '\n'
        
        super().display(msg, pos)  # Display the modified string

t = CustomTQDM(
    total=SIMS,
    bar_format="Winrate: {postfix}% |{l_bar}{bar}| Elapsed: {elapsed} | {rate_fmt}",
    ncols=150
)

for i in range(SIMS):
    play(i)
    winrate = round(win / (win + loss) * 100, 2) if (win + loss) > 0 else 0
    t.set_postfix_str(f"{winrate}".ljust(5))  # Update winrate
    t.update()

t.close()  # Ensure tqdm properly closes

if not VERBOSE_LOGGING:
    print(f'Player w/l: {win}/{loss} = {round(win/(win+loss)*100,2)}% winrate')
print(f'Average game duration (dealer cards): {round(total_dealer_cards / SIMS, 2)}')