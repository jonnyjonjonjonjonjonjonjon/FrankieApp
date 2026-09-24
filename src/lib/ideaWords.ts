/**
 * "More pictures" in Try's Find (backlog item 16) offers only Mulberry
 * pictures on these lists: one hand-checked pass over every Mulberry label, so
 * a food search shows foods and an activity search shows things to do or places
 * to go. The Mulberry index has no categories, and a blocklist kept letting
 * through body, illness and harm words ("Burn" for "bur", "Choke" for "cho")
 * and plain objects ("Table" for "tab").
 *
 * Left out on purpose: body and anatomy, illness, medicine and first aid,
 * harm, death and weapons, toilet and intimate care, feelings, letters,
 * numbers, shapes and maths, colours, directions, school subjects, kitchen
 * tools, pet food, drinks thickened for swallowing, and alcohol (beer, lager,
 * wine, champagne, pint: the owner's call). A food or activity that isn't here
 * can still be added as a new word with its own picture.
 *
 * Entries are Mulberry labels, lower case, as `ideaWord()` normalises them.
 */

/**
 * Mulberry pictures (ids) left out although their word is on a list: the
 * wrong meaning ("cricket" the insect, the live turkey, the colour orange, a
 * "sweet" pudding), celebrating with champagne, and washing with no clothes on.
 */
export const LEFT_OUT_IDS = new Set(['cricket_2', 'turkey', 'orange_2', 'sweet_2', 'celebrate_3-to', 'shower_1-to'])

/** Foods and drinks (all shelves: breakfast, lunch, dinner, fruit, treats, drinks). */
export const FOOD_WORDS = `
almond, apple, apple juice, apricot, artichoke, asparagus, aubergine, avocado,
bacon, bagel, baked beans, banana, bap, beans on toast, beansprouts, beef, beetroot,
berry, biscuit chocolate chip, biscuits, birthday cake, blackberry, blackcurrant juice,
blackcurrants, brazil nut, bread, bread roll, bread roll filled, bread roll granary,
bread slice, broad beans, broccoli, brussel sprouts, bun currant, butter,
butternut squash, cabbage, cake, cake bar, cake cup cake, cake slice, cake sponge,
candy cane, candy floss, carrot, casserole, cashew, cauliflower, celeriac, celery,
cereal, chapatti, cheese, cheese brie, cheese burger, cheese grated,
cheese on toast melted, cheese slices, cheese stilton, cherry, chestnuts,
chewing gum, chicken deep fried, chicken leg, chicken nuggets, chicken pieces,
chilli pepper, chinese cabbage, chinese food, chips, chocolate, chocolate bar,
chocolate box, chocolate egg, chocolate log, christmas cake, christmas pudding,
coconut, coffee, corned beef, cornet, cornflakes, cottage cheese, courgette, crab,
cracker, cranberries, cranberry juice, crisp bread, crisps,
crisps cheese puffs, croissant, cucumber, currants, curry, danish pastry, dates,
dessert, doughnut, easter egg, egg, egg boiled, egg fried, egg on toast, eggs,
eggs scrambled, fennel, fig, fish and chips, fish battered, fish burger,
french stick, fried breakfast, fromage frais, frozen fish fingers, frozen pizza,
fruit, garlic bread, gooseberry, grape juice, grapefruit, grapefruit juice, grapes,
green beans, ham, hamburger, hazelnut, honey, hot chocolate, hot dog, ice cream,
ice lolly, jacket potato, jam, jam tart, jelly, jelly beans, kebab, kiwi, lasagne,
leek, lemon, lemon squash, lemonade, lentils, lettuce, lime, lollipop, macadamias,
macaroni, macaroni cheese, mange tout, mango, marmite, marrow, marshmallows,
mash potato, mayonnaise, meatballs and spaghetti, melon, meringues, milk, milkshake,
milkshake banana, milkshake chocolate, milkshake strawberry, mince pie, mints,
muesli, mushroom, mussel, noodles, nuts, olives, omelette, onion, onion rings,
orange, orange fizzy drink, orange juice, orange squash, packed lunch, pancake,
pancakes, parsnip, passion fruit, pasta, pastie, pate, peach, peanut,
peanut butter, pear, peas, pecan, pick and mix, pie, pie apple, pie cherry, pie meat,
pineapple, pineapple juice, pistachios, pizza, plum, plum tomato, poppadoms,
pork chop, porridge, potato, prawn, pretzel, pumpkin, pumpkin pie, quiche flan,
radish, raisin, ravioli, rhubarb, rice, rice cake, roast dinner, salad,
salami sausage, sandwich, sandwich cheese, sandwich chicken, sandwich ham,
sandwich sausage, sandwich toasted, satsuma, sausage and mash, sausage cumberland,
sausage roll, sausages, shrimp, simnel cake, soup, soup carrot, soup chicken,
soup mushroom, soup onion, soup pea, soup tomato, soup vegetable, spaghetti,
spaghetti bolognaise, spinach, spring onions, steak, stir fry, strawberry,
strawberry jam, stuffing, swede, sweet, sweet potato, sweetcorn, swiss roll,
takeaway burger, takeaway burger and chips, takeaway chinese, takeaway indian,
takeaway pizza, tart, tea, tinned apricots, tinned cherries, tinned peaches,
tinned pears, tinned pineapple, tinned plums, toast, tomato, tomato juice, tuna,
turkey, turnip, vegetables, wafer, walnut, water, watermelon, yogurt,
yorkshire pudding, yule log
`

/** Things to do and places to go (all shelves: home, out, active, fun, friends, relax). */
export const ACTIVITY_WORDS = `
activity centre, aerobics dance, aquarium, archery, art, art class, badminton, bake,
ball pool, balloon, barbeque, baseball game, basketball, basketball game, bath,
beach, beads, big wheel, bingo, boccia, bonfire, bonfire night, bowling, brush hair,
brush teeth, bubble bath, bubbles, bubbles blow, build, cafe, camp, canoe, caravan,
castle, celebrate, celebrate birthday, church, clay, clean dishes, clean room,
clean window, climb tree, climbing rock, climbing wall, colouring book, comedy tv,
computer, computer art, computer game, cook, cook school, craft table, cricket,
cycle, dance, darts, decorate, decorate cake, decorate tree, dig, dive, drama,
drama class, draw, drum, dust, easter egg hunt, exercise, feed cat, feed dog,
finger painting, fireworks, flatscreen tv, flute, fold clothes, football, golf,
guitar, gym, haircut, harvest festival, hike, hoover, iron, jigsaw puzzle, jog,
judo, jump, jungle gym, keyboard electric, kite, knit, laptop, lego, make the bed,
make up, marbles, merry go round, music, music class, musical instruments,
nail care, nail polish, paint, paint box, parade, park, party celebration,
party popper, pat dog, piano, picnic, play, play area, playdough, playing cards,
playstation, polish nails, pool snooker, pottery, pray, puppet, race athletics,
read, read book, relax, rest, ride horse, roller coaster, rollerskate, roll pastry,
rowing boat, run, sand pit, sensory room, set the table, sew, shampoo hair, shop,
shower, sing, skate, skate park, skateboard, ski, skip, sledge, slide, stickers,
sun lounger, swim, swimming class, swing, take picture, telephone, tennis,
theme park, tidy up, trampoline, trick or treat, tv drama, use computer,
vacuum cleaner, visit, volleyball, walk, walk dog, wash clothes, wash up,
water plants, wii, wii fit, wipe table, write, xylophone, yo-yo
`
