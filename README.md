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
**Concept:** Direct state assignment
- `turn_on()` — sets `lit` to `true`
- `turn_off()` — sets `lit` to `false`

### 03 — greeter.gil
**Concept:** Parameterized intents with predicate arguments
- `greet(Person)` — sets `greeted[Person]` to true
- `farewell(Person)` — unsets greeted

### 04 — logic_gates.gil
**Concept:** Three-valued logic with `and`, `or`, `not`
- `and_gate(A, B, Out)` — sets `Out` based on three-valued AND
- `or_gate(A, B, Out)` — sets `Out` based on three-valued OR
- `not_gate(In, Out)` — inverts the input

### 05 — counter.gil
**Concept:** Integer counter with arithmetic
- `reset()` — sets `count[0]` to true
- `inc(N)` — atomically decrements `count[N]` and increments `count[N + 1]`

```sh
node repl.js scripts/05_counter.gil
gil> intent reset
gil> intent inc 0
gil> get count 1
```

### 06 — access_control.gil
**Concept:** Guarded access with authorization checks
- `grant_access(Person, Room)` / `revoke_access(Person, Room)`
- `enter(Person, Room)` — only succeeds when `authorized[Person, Room]`
- `leave(Person, Room)` — unsets inside
- `list_occupants(Room)` — enumerates via `when`

### 07 — traffic_light.gil
**Concept:** Traffic light state management
- `set_green()` — activates green, deactivates yellow and red
- `set_yellow()` — activates yellow, deactivates green and red
- `set_red()` — activates red, deactivates green and yellow
- `detect_color()` — reflects the active color into `active_color`

### 08 — inventory.gil
**Concept:** Item management with quantity tracking via integer arithmetic
- `pickup(Who, What)` — sets `carries[Who, What]` to true
- `drop(Who, What)` — sets `carries[Who, What]` to false
- `set_count(Who, What, N)` — when carrying, sets `item_count[Who, What, N]` to true
- `add_one(Who, What, N)` — when carrying, replaces `item_count[Who, What, N]` with `item_count[Who, What, N + 1]`

### 09 — voting.gil
**Concept:** Ballot recording with pattern-matched tally
- `vote(Voter, Choice)` — records `voted[Voter, Choice]`
- `tally()` — derives `ballot_for[Choice, Voter]` from recorded votes via pattern matching
- `results(Choice)` — detects whether a choice received any votes (`received_votes[Choice]`)
- `clear_votes()` — resets all voting state

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
**Concept:** Generic state machine with activated-state tracking
- `set_state(State)` — sets `active[State]` to true
- `transition(From, To)` — when `active[From]`, deactivates it and activates `To`
- `reset()` — deactivates all states via `when active[S]`

### 13 — social_graph.gil
**Concept:** Friend-of-friend suggestions (three-valued-logic aware)
- `befriend(A, B)` / `unfriend(A, B)` — manage friendships
- `suggest_friends(Person)` — suggests friends-of-friends (avoids `not` on unknown values, which fails in three-valued logic)
- `accept_suggestion(Person, Suggested)` — converts suggestion to friendship

### 14 — resource_alloc.gil
**Concept:** Resource allocation with integer priority levels
- `acquire(Who, Resource)` — claims resource, sets `in_use[Resource]` and `owner[Resource, Who]`
- `release(Who, Resource)` — releases resource if owner
- `set_priority(Resource, N)` — when acquired, assigns integer priority level `N`

### 15 — auth.gil
**Concept:** User registration and permission checks
- `register(User)` — creates a user account
- `grant_permission(User, Action)` — grants action ability
- `check_access(User, Action)` — verifies user has permission for action

### 16 — game_rpg.gil
**Concept:** RPG combat and health management
- `damage(Target)` — sets `healthy[Target]` to false
- `heal(Target)` — sets `healthy[Target]` to true
- `is_alive(Who)` — when `healthy[Who]`, sets `alive[Who]` to true

### 17 — room_nav.gil
**Concept:** Multi-room navigation
- `connect_rooms(A, B)` — creates bidirectional exits
- `go(Player, From, To)` — moves player between connected rooms
- `spawn(Player, Room)` — places player in a room
- `look_around(Player)` — discovers visible exits

### 18 — convergence.gil
**Concept:** Graph activation via convergence
- `set_source(Node)` — marks a node as a source
- `amplify()` — propagates activation from source nodes through linked neighbors
- `cascade()` — continues activation propagation through linked neighbors

### 19 — battleship.gil
**Concept:** Targeting, damage detection, and sector mapping via integer arithmetic
- `place_ship(Ship, X, Y)` — positions a ship at a coordinate
- `fire_at(X, Y)` — fires a shot, checks for hits
- `check_damage(Ship)` — detects if the ship has been hit
- `hit_ship(X, Y)` — marks a hit at a position
- `sector_report(Ship)` — derives sector coordinates `X / 2, Y / 2` from hit positions (integer division folding)

### 20 — life.gil
**Concept:** Grid cell shift via integer arithmetic on coordinates
- `set_cell(X, Y)` — marks a cell as alive
- `clear_cell(X, Y)` — marks a cell as dead
- `shift(Dx, Dy)` — moves every live cell by `(Dx, Dy)`, computing `X + Dx, Y + Dy` with integer arithmetic

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