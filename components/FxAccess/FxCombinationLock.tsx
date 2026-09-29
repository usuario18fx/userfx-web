import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./FxCombinationLock.css";

const DEFAULTS = [3,4,7] as const;
const DIGITS = [0,1,2,3,4,5,6,7,8,9] as const;

function Dial({index,defaultValue}:{index:number;defaultValue:number}) {
  const [value,setValue] = useState(defaultValue);

  return (
    <div className="fx-combo-dial">
      <div className="fx-combo-wheel" style={{transform:`rotateX(${value * 36}deg)`}}>
        {DIGITS.map((digit) => (
          <label key={digit} className={`fx-combo-face fx-combo-face-${digit}`}>
            <input type="radio" name={`fx-combo-wheel-${index}`} checked={value === digit} onChange={() => setValue(digit)} />
            <span>
              {digit}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function FxCombinationLock() {
  const [target,setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const resolveTarget = () => {
      const node = document.querySelector<HTMLElement>(".pvr-direct-card");
      setTarget(node);
    };

    resolveTarget();

    const observer = new MutationObserver(resolveTarget);
    observer.observe(document.body,{childList:true,subtree:true});

    return () => observer.disconnect();
  },[]);

  if (!target) return null;

  return createPortal(
    <div className="fx-combo-lock" aria-label="Interactive combination lock">
      <div className="fx-combo-help">
        PRIVATE LOCK
      </div>
      {DEFAULTS.map((value,index) => (
        <Dial key={index} index={index} defaultValue={value} />
      ))}
    </div>,
    target,
  );
}
