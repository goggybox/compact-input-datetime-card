console.log("compact-input-datetime-card.js loaded!");

class CompactInputDatetimeCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (this._config && this._card) {
      const stateObj = hass.states[this._entity];
      if (stateObj) {
        // format time
        let displayTime = stateObj.state;
        if (displayTime && displayTime.includes(" ")) {
          displayTime = displayTime.split(" ")[1];
        }
        if (displayTime && displayTime.length > 5) {
          displayTime = displayTime.substring(0, 5);
        }

        const hoursInput = this._card.querySelector(".hours-input");
        const minutesInput = this._card.querySelector(".minutes-input");
        if (hoursInput && minutesInput) {
          if (displayTime) {
            const [hours, minutes] = displayTime.split(":");
            hoursInput.value = hours || "";
            minutesInput.value = minutes || "";
          } else {
            hoursInput.value = "";
            minutesInput.value = "";
          }
        }

        // update description
        const toggleConfig = this._config.toggle || {};
        const toggleEntityId = toggleConfig.entity;

        // determine whether on or off
        let isOn = false;
        if (toggleEntityId) {
          const toggleStateObj = hass.states[toggleEntityId];
          if (toggleStateObj) {
            const domain = toggleEntityId.split(".")[0];
            isOn = ["on", "open", "true"].includes(toggleStateObj.state.toLowerCase());
          }
        }

        // update toggle
        this._updateToggle(hass);
      }
    }
  }

  _updateToggle(hass) {
    const toggleWrapper = this._card.querySelector(".toggle-wrapper");
    const iconEl = this._card.querySelector("#toggle-icon");
    const iconWrapper = this._card.querySelector(".toggle-icon-wrapper");
    const descriptionEl = this._card.querySelector(".description");
    const datetimeWrapper = this._card.querySelector(".datetime-input-wrapper");

    const toggleConfig = this._config.toggle || {};
    const toggleEntityId = toggleConfig.entity;
    const stateObj = hass.states[this._entity];
    const inputDatetimeIcon = stateObj?.attributes.icon || "mdi:clock-outline";

    // vars to store whether toggle is on or off
    let isOn = false;
    let toggleStateObj = null;

    if (toggleEntityId) {
      toggleStateObj = hass.states[toggleEntityId];
      if (toggleStateObj) {
        const domain = toggleEntityId.split(".")[0];
        if (["binary_sensor", "input_boolean", "switch", "light", "fan", "cover"].includes(domain)) {
          isOn = ["on", "open", "true"].includes(toggleStateObj.state.toLowerCase());
        }
      }
    }

    // ----- set description -----
    let displayName = this._config.name; // if only one general name was given
    if (toggleConfig.on?.name && isOn) {
      // if two separate names were given for the on state and off state, use them
      displayName = toggleConfig.on.name;
    } else if (toggleConfig.off?.name && !isOn) {
      displayName = toggleConfig.off.name;
    }
    if (!displayName) {
      // no name has been given
      displayName = stateObj?.attributes.friendly_name || "Next Activation";
    }
    if (descriptionEl) {
      descriptionEl.textContent = displayName;
    }

    // ----- hide input_datetime when off -----
    const shouldHide = (isOn && toggleConfig.on?.hide_input_datetime) ||
      (!isOn && toggleConfig.off?.hide_input_datetime);

    if (datetimeWrapper) {
      datetimeWrapper.style.display = shouldHide ? "none" : "flex";
    }

    // determine icon and color
    let icon, iconColour, background;

    // get toggle config from user
    if (toggleEntityId && toggleStateObj) {
      let activeConfig = null;
      if (toggleConfig.on !== undefined && toggleConfig.off !== undefined) {
        activeConfig = isOn ? toggleConfig.on : toggleConfig.off;
      } else {
        activeConfig = toggleConfig;
      }

      // icon
      icon = activeConfig.icon || toggleStateObj?.attributes.icon || inputDatetimeIcon;
      // icon colour
      iconColour = activeConfig.icon_colour || (isOn ? "green" : "red")
      // background colour
      const defaultOnBg = "#bdefbd"
      const defaultOffBg = "linear-gradient(rgba(255,0,0,0.25), rgba(255,0,0,0.25)), var(--card-background-color)";
      background = activeConfig.background_colour || (isOn ? defaultOnBg : defaultOffBg);

    } else {

      // if no toggle config was given, use defaults
      icon = toggleConfig.icon || inputDatetimeIcon;
      iconColour = toggleConfig.icon_colour || this._iconColour || "var(--secondary-text-color)";
      background = "transparent";
    }

    // apply everything to the DOM
    if (iconEl) {
      iconEl.icon = icon;
      iconEl.style.color = iconColour;
    }
    if (iconWrapper) {
      iconWrapper.style.background = background;
    }

    // handle click on toggle
    toggleWrapper.onclick = () => {
      if (!toggleEntityId || !toggleStateObj) return;

      const domain = toggleEntityId.split(".")[0];
      if (domain === "binary_sensor") return;

      let service, serviceData;
      if (domain === "input_boolean") {
        service = isOn ? "turn_off" : "turn_on";
        serviceData = { entity_id: toggleEntityId };
      } else if (["switch", "light", "fan"].includes(domain)) {
        service = isOn ? "turn_off" : "turn_on";
        serviceData = { entity_id: toggleEntityId };
      } else if (domain === "cover") {
        service = isOn ? "close_cover" : "open_cover";
        serviceData = { entity_id: toggleEntityId };
      } else {
        return;
      }

      hass.callService(domain, service, serviceData);
    };
  }

  setConfig(config) {
    if (!config.input_datetime) {
      throw new Error("Compact Input Datetime Card: You must provide an 'input_datetime' block in the config.")
    }
    if (!config.input_datetime.entity) {
      throw new Error("Compact Input Datetime Card: You must specify 'input_datetime.entity'.")
    }
    if (!config.input_datetime.entity.startsWith("input_datetime.")) {
      throw new Error("Compact Input Datetime Card: The entity must be an input_datetime.")
    }

    const entity = config.input_datetime.entity;
    const cardBgColour = config.background_colour || "var(--card-color)";
    const cardFontColour = config.font_colour || "var(--secondary-text-color)";

    const inputDatetimeBgColour = config.input_datetime.background_colour || "#f5f5f5";
    const inputDatetimeFontColour = config.input_datetime.font_colour || cardFontColour;

    const iconColour = config.icon_colour || "var(--secondary-text-color)";

    const border = config.border || "1px solid #e0e0e0";

    this._iconColour = iconColour;
    this._inputDatetimeBgColour = inputDatetimeBgColour;

    this._config = config;
    this._entity = entity;

    // html
    this.innerHTML = `
      <div class="card-container">
        <div class="card">
          <div class="toggle-wrapper">
            <div class="toggle-icon-wrapper">
              <ha-icon id="toggle-icon" icon="mdi:clock-outline"></ha-icon>
            </div>
          </div>
          <div class="content">
            <div class="bg" style="background: ${cardBgColour};">
              <div class="overlay">
                <div class="description">Loading...</div>
                <div class="datetime-input-wrapper">
                  <input class="hours-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" />
                  <span class="colon">:</span>
                  <input class="minutes-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // styles
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        --height: 64px;
        --icon-width: var(--height);
        --icon-border-radius: 15px;
        --icon-font-size: 36px;
      }

      .card-container {
        max-width: 500px;
        height: var(--height);
        background: var(--card-background-color);
        border: ${border};
        border-radius: 15px;
        margin: 0 auto;
        margin-right: 5px;
        margin-left: 5px;
        overflow: hidden;
      }

      .card {
        position: relative;
        height: var(--height);
      }

      .toggle-wrapper {
        position: absolute;
        width: var(--icon-width);
        height: var(--height);
        flex-shrink: 0;
        cursor: pointer;
      }

      .toggle-icon-wrapper {
        position: relative;
        z-index: 2;
        width: 100%;
        height: 100%;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 15px;
      }

      .toggle-icon-wrapper ha-icon {
        --mdc-icon-size: 32px;
        filter: drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.15));
      }

      .content {
        height: var(--height);
        z-index: 1;
        box-sizing: border-box;
        padding: 3px 3px 3px 5px;
        margin-left: -5px;
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
      }

      .bg {
        position: absolute;
        border-radius: var(--icon-border-radius);
        width: 100%;
        height: 100%;
      }

      .overlay {
        height: 100%;
        width: 100%;
        position: absolute;
        top: 0;
        padding-left: 52px;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-sizing: border-box;
      }

      .description {
        font-weight: bold;
        font-size: 18px;
        padding-left: 30px;
        color: ${cardFontColour};
      }

      .datetime-input-wrapper {
        display: flex;
        align-items: center;
        background: ${inputDatetimeBgColour};
        border-radius: 8px;
        margin-right: 14px;
        padding: 0 8px;
      }

      .hours-input, .minutes-input {
        background: transparent;
        font: inherit;
        font-size: 14px;
        height: 44px;
        color: ${inputDatetimeFontColour};
        border: none;
        outline: none;
        width: 30px;
        text-align: center;
        -moz-appearance: textfield;
      }

      .hours-input::-webkit-outer-spin-button,
      .hours-input::-webkit-inner-spin-button,
      .minutes-input::-webkit-outer-spin-button,
      .minutes-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .colon {
        margin: 0 2px;
        color: ${iconColour};
      }
    `;
    this.appendChild(style);
    this._card = this.querySelector(".card-container");

    const hoursInput = this._card.querySelector(".hours-input");
    const minutesInput = this._card.querySelector(".minutes-input");

    // function to take inputted time and apply to the input_datetime
    const applyTime = () => {
      const processField = (input, min, max) => {
        let val = input.value.trim();
        if (val === "") return null;
        val = val.replace(/[^0-9]/g, "");
        if (val === "") return null;
        const num = parseInt(val, 10);
        return isNaN(num) ? min : Math.min(max, Math.max(min, num));
      };

      const h = processField(hoursInput, 0, 23);
      const m = processField(minutesInput, 0, 59);

      const hValid = h !== null;
      const mValid = m !== null;

      hoursInput.value = hValid ? h.toString().padStart(2, '0') : "";
      minutesInput.value = mValid ? m.toString().padStart(2, '0') : "";

      if (hValid && mValid) {
        const timeValue = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
        this._hass.callService("input_datetime", "set_datetime", {
          entity_id: this._entity,
          time: timeValue
        });
      }
    };

    // input listeners
    [hoursInput, minutesInput].forEach(input => {
      input.addEventListener("input", (e) => {
        let v = e.target.value.replace(/[^0-9]/g, '');
        if (v.length > 2) v = v.slice(0, 2);
        e.target.value = v;
      });
    });

    // allow the user to press enter to set time
    const handleKeydown = (e) => {
      if (e.key === "Enter") applyTime();
    };

    hoursInput.addEventListener("keydown", handleKeydown);
    minutesInput.addEventListener("keydown", handleKeydown);
    hoursInput.addEventListener("blur", applyTime);
    minutesInput.addEventListener("blur", applyTime);
  }

  static getStubConfig() {
    return {
      border: "1px solid #e0e0e0",
      background_colour: "var(--card-background-color)",
      font_colour: "var(--secondary-text-color)",
      input_datetime: {
        entity: "input_datetime.example",
        background_colour: "#f5f5f5",
        font_colour: "#727272"
      },
      toggle: {
        entity: "input_boolean.example",
        on: {
          icon: "mdi:check",
          icon_colour: "green",
          background_colour: "#bdefbd",
          name: "Enabled"
        },
        off: {
          icon: "mdi:close",
          icon_colour: "red",
          background_colour: "#ffbfbf",
          name: "Disabled",
          hide_input_datetime: true
        }
      }
    };
  }
}

customElements.define("compact-input-datetime-card", CompactInputDatetimeCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "compact-input-datetime-card",
  name: "Compact Input Datetime Card",
  description: "A compact card for input_datetime entities, with an optional toggle button.",
});