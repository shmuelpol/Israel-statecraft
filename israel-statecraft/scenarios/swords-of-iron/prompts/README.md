# Actor Decision Prompts (prompts@1.0.0-worldview26)

Each actor's decision prompt is composed ENTIRELY in the actor's own strategic language (closed decision #36).
At call time the runtime assembles: [promptCore] + belief-limited situation brief (translated into the actor's language by the runtime model) + [decisionGuidance].
The mock provider executes rule policies encoding the same cores and records the promptRef for audit.

| actor | language | file |
|---|---|---|
| israel | he | israel.md |
| israel_security | he | israel_security.md |
| israel_public | he | israel_public.md |
| hamas | ar | hamas.md |
| hezbollah | ar | hezbollah.md |
| iran | fa | iran.md |
| houthis | ar | houthis.md |
| usa | en | usa.md |
| russia | ru | russia.md |
| china | zh | china.md |
| turkey | tr | turkey.md |
| egypt | ar | egypt.md |
| qatar | ar | qatar.md |
| saudi | ar | saudi.md |
| uae | ar | uae.md |
| jordan | ar | jordan.md |
| pa | ar | pa.md |
| palestinian_publics | ar | palestinian_publics.md |
| syria_regime | ar | syria_regime.md |
| lebanon_state | ar | lebanon_state.md |
| iraq | ar | iraq.md |
