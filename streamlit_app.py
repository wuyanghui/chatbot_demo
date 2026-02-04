from __future__ import annotations

import json
from typing import Any, Dict, Tuple

import requests
import streamlit as st


st.set_page_config(
    page_title="Landy Agents Console",
    page_icon="🤖",
    layout="centered",
)


ENDPOINTS: Dict[str, Dict[str, str]] = {
    "v1": {
        "url": "https://landy-ai.vercel.app/invoke",
        "message_label": "User Input",
        "id_label": "State ID",
        "message_key": "user_input",
        "id_key": "state_id",
    },
    "v2": {
        "url": "https://landy-ai.vercel.app/api/v2/invoke",
        "message_label": "Message",
        "id_label": "Thread ID",
        "message_key": "message",
        "id_key": "thread_id",
    },
}


def request_agent(version: str, payload: Dict[str, str]) -> Tuple[Dict[str, Any] | None, str | None]:
    endpoint = ENDPOINTS[version]["url"]
    try:
        response = requests.post(endpoint, json=payload, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:  # pragma: no cover - UI feedback
        return None, f"Request failed: {exc}"

    try:
        data = response.json()
    except json.JSONDecodeError as exc:  # pragma: no cover - UI feedback
        return None, f"Invalid JSON response: {exc}"

    return data, None


def render_response(data: Dict[str, Any]) -> None:
    graph_output = data.get("graph_output")
    listing = data.get("recommended_listing")

    st.subheader("Graph Output")
    if graph_output is None:
        st.info("No graph_output in response.")
    elif isinstance(graph_output, (dict, list)):
        st.json(graph_output)
    else:
        st.code(str(graph_output), language="json")

    st.subheader("Recommended Listing")
    if listing is None:
        st.info("No recommended_listing in response.")
    elif isinstance(listing, (dict, list)):
        st.json(listing)
    else:
        st.code(str(listing), language="json")

    if extra_keys := {
        key: value for key, value in data.items() if key not in {"graph_output", "recommended_listing"}
    }:
        st.subheader("Raw Response")
        st.json(extra_keys)


def render_agent_panel(version: str) -> None:
    meta = ENDPOINTS[version]
    with st.form(key=f"agent-{version}"):
        message = st.text_area(meta["message_label"], placeholder="Say hello to the agent...", height=120)
        identifier = st.text_input(meta["id_label"], placeholder="Optional identifier for session continuity")
        submitted = st.form_submit_button(f"Invoke {version.upper()} agent")

        if submitted:
            if not message:
                st.warning("Message is required.")
            else:
                payload = {
                    meta["message_key"]: message,
                    meta["id_key"]: identifier or "",
                }
                with st.spinner("Contacting agent..."):
                    data, error = request_agent(version, payload)

                if error:
                    st.error(error)
                elif not data:
                    st.warning("Empty response received.")
                else:
                    render_response(data)


def main() -> None:
    st.title("Landy Agents Console")
    st.caption("Quickly inspect responses from the V1 and V2 Landy agents.")

    tabs = st.tabs(["V1 Agent", "V2 Agent", "About"])

    with tabs[0]:
        render_agent_panel("v1")

    with tabs[1]:
        render_agent_panel("v2")

    with tabs[2]:
        st.markdown(
            """
            #### Architecture
            - **Streamlit UI** renders individual forms per agent version.
            - **Stateless fetcher** posts directly to the provided Landy endpoints.
            - **Response visualizer** highlights `graph_output` and `recommended_listing`,
              and displays the residual payload for full transparency.

            #### Deployment on Vercel
            - Ensure the project contains `requirements.txt` and `vercel.json` (included in repo).
            - Deploy via `vercel --prod` or through the dashboard by linking this repository.
            - Streamlit runs within a single lightweight serverless function keeping cold-start minimal.
            """
        )


if __name__ == "__main__":
    main()
