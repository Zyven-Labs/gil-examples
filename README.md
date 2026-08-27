# Gil Language Tutorial — 20 Examples

A 20-part hands-on tutorial for the **Gnosis Intent Language (Gil)** — a three-valued
logic language for defining *intents* that transform a *frontier* of predicate
values.

Each example builds on the previous one, introducing new Gil concepts incrementally.

---

## Prerequisites

- Node.js (v14+)
- The `@zyvenlabs/giljs` native addon

```sh
npm install https://github.com/Zyven-Labs/giljs
```

---

## Examples

### 01 — hello.gil
**Concept:** Basic intent declarations
- `say_hello` — sets `greeting` to `true`
- `say_goodbye` — sets `greeting` to `false`

```sh
node repl.js scripts/01_hello.gil
gil> intent say_hello
gil> get greeting
```

### 02 — lightswitch.gil
**Concept:** Toggle state via `when` guards
- `turn_on` / `turn_off` — direct assignment
- `toggle` — reads current state and flips it using `when lit` / `when not lit`

### 03 — greeter.gil
**Concept:** Parameterized intents with predicate arguments
- `greet(Person)` — sets `greeted[Person]` to true
- `greet_formal(Title, Person)` — sets title and greeted
- `farewell(Person)` — unsets greeted

### 04 — logic_gates.gil
**Concept:** Three-valued logic with `and`, `or`, `not`
- `and_gate(A, B, Out)` — sets `Out` based on three-valued AND
- `or_gate(A, B, Out)` — sets `Out` based on three-valued OR
- `not_gate(In, Out)` — inverts the input

### 05 — counter.gil
**Concept:** Stateful counter via convergence
- `inc(Counter)` — toggles `Counter` through `next[]` intermediate predicates
- `zero(Counter)` — resets to false

### 06 — access_control.gil
**Concept:** Guarded access with authorization checks
- `grant_access(Person, Room)` / `revoke_access(Person, Room)`
- `enter(Person, Room)` — only succeeds when `authorized[Person, Room]`
- `leave(Person, Room)` — unsets inside
- `list_occupants(Room)` — enumerates via `when`

### 07 — traffic_light.gil
**Concept:** State machine transitions
- `next_green()` / `next_yellow()` / `next_red()` — individual transitions
- `cycle()` — full green \u2192 yellow \u2192 red \u2192 green loop

### 08 — inventory.gil
**Concept:** Item management
- `pickup(Who, What)` — sets `carries[Who, What]` (only if not already carrying)
- `drop(Who, What)` — removes carried item
- `swap(Who, Give, Take)` — exchanges one item for another
- `has_item(Who, What)` — convenience check

### 09 — voting.gil
**Concept:** Ballot collection
- `vote(Voter, Choice)` — records vote and ballot choice
- `tally()` — counts ballots by choice
### 10 — pathfinder.gil
**Concept:** Graph reachability via convergence (BFS)
- `propagate(Node)` — activates all nodes reachable via `connected`
- `link(A, B)` / `unlink(A, B)` — manage symmetric connections

This is the canonical Gil convergence example from the spec.

### 11 — alarm_system.gil
**Concept:** Cascading event propagation
- `trigger(Sensor)` — sets triggered
- `arm()` / `disarm()` — system state
- `propagate_alarm()` — cascades triggered state through linked sensors
- `link_sensors(A, B)` — creates bidirectional links

### 12 — state_machine.gil
**Concept:** Generic finite state machine
- `set_state(State)` — activates state, deactivates others
- `transition(From, To)` — moves from one state to another
- `reset()` — deactivates all states

### 13 — social_graph.gil
**Concept:** Friend-of-friend suggestions
- `befriend(A, B)` / `unfriend(A, B)` — manage friendships
- `suggest_friends(Person)` — finds friends-of-friends not already friends
- `accept_suggestion(Person, Suggested)` — converts suggestion to friendship

### 14 — resource_alloc.gil
**Concept:** Mutual exclusion with ownership
- `acquire(Who, Resource)` — claims resource when not in use
- `release(Who, Resource)` — releases if owner
- `transfer(Who, Resource, To)` — changes ownership

### 15 — auth.gil
**Concept:** User authentication and permissions
- `register(User, Pass)` — creates user account
- `login(User, Pass)` — logs in when password matches
- `logout(User)` — clears session
- `grant_permission(User, Action)` — grants action ability
- `check_access(User, Action)` — verifies access

### 16 — game_rpg.gil
**Concept:** RPG combat and progression
- `attack(Attacker, Target)` — reduces target health
- `heal(Healer, Target)` — restores health
- `equip(Who, What)` — sets equipment
- `level_up(Who)` — toggles level up via intermediate predicate

### 17 — room_nav.gil
**Concept:** Multi-room navigation
- `connect_rooms(A, B)` — creates bidirectional exits
- `go(Player, From, To)` — moves player between connected rooms
- `spawn(Player, Room)` — places player in a room
- `look_around(Player)` — discovers visible exits

### 18 — convergence.gil
**Concept:** Mutual reinforcement and oscillation
- `activate_both()` — sets both signals true
- `amplify()` — each signal reinforces the other (fixed point)
- `dampen()` — each signal suppresses the other (fixed point)
- `oscillate()` — toggles between signals each convergence iteration

### 19 — battleship.gil
**Concept:** Targeting and hit detection
- `place_ship(Ship, X, Y)` — positions a ship
- `fire_at(X, Y)` — fires a shot, checks for hits
- `check_sunk(Ship)` — detects if all ship positions are hit

### 20 — life.gil
**Concept:** Cellular automaton rules
- `set_cell(X, Y)` / `clear_cell(X, Y)` — manage cells
- `neighbors(X, Y)` — counts neighbors via pattern matching
- `step()` — applies life rules (birth, survival, death)

---

## Interactive REPL

```sh
node repl.js scripts/03_greeter.gil
```

### Commands

| Command | Description |
|---------|-------------|
| `intent <name> [args...]` | Execute an intent with optional arguments |
| `get <predicate> [args...]` | Read a predicate value (displays `true`/`false`/`both`) |
| `set <predicate> [args...] <v>` | Set a predicate to `true`, `false`, or `both` |
| `del <predicate> [args...]` | Delete a predicate from the frontier |
| `query <pname> [pattern...]` | Pattern-match predicates (UPPERCASE = variable) |
| `ls` | List all intents discovered in the script |
| `dump` | Show frontier state hints |
| `help` | Print command reference |
| `.exit` | Exit the REPL |

### Example session

```
$ node repl.js scripts/13_social_graph.gil

  Gil REPL - loaded: 13_social_graph.gil
  Intents: befriend, unfriend, suggest_friends, accept_suggestion

gil> intent befriend alice bob
  Executed befriend(alice, bob)
gil> intent befriend bob carol
  Executed befriend(bob, carol)
gil> intent suggest_friends alice
  Executed suggest_friends(alice)
gil> query suggested [alice, Who]
  Matches for suggested[alice, Who]:
    suggested[alice, carol] = true (1)
gil> intent accept_suggestion alice carol
  Executed accept_suggestion(alice, carol)
gil> query friends [alice, Friend]
  Matches for friends[alice, Friend]:
    friends[alice, bob] = true (1)
    friends[alice, carol] = true (1)
```

---

## Validation Tool

A validation script (`tools/validate.js`) loads every example and runs sanity checks.

```sh
npm test
```

---

## License

MIT
- `clear_votes()` — resets all votes