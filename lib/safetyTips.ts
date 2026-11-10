export interface SafetyTip {
  title: string;
  instruction: string;
}

export const SAFETY_TIPS: Record<string, SafetyTip[]> = {
  FIRE: [
    { title: "Stay Low & Crawl", instruction: "Smoke and toxic gases rise. Stay close to the floor where the air is cleanest." },
    { title: "Evacuate Immediately", instruction: "Do not stop to collect belongings. Exit calmly through the nearest emergency exit." },
    { title: "Check Doors for Heat", instruction: "Touch doorknobs with the back of your hand before opening. If hot, seek another exit." },
    { title: "Stop, Drop, and Roll", instruction: "If your clothing catches fire, drop to the ground and roll repeatedly to extinguish flames." },
  ],
  ROAD_ACCIDENT: [
    { title: "Ensure Scene Safety", instruction: "Turn on hazard flashers. If possible, move uninjured persons away from active traffic lanes." },
    { title: "Do Not Move Injured Persons", instruction: "Unless there is imminent fire or submerged danger, avoid moving injured people to protect the spine." },
    { title: "Turn Off Ignitions", instruction: "Turn off vehicle engines to reduce the risk of electrical sparks igniting spilled fuel." },
    { title: "Apply Direct Pressure to Bleeding", instruction: "Use clean cloth or clothing to apply firm, steady pressure on heavy bleeding wounds." },
  ],
  MEDICAL: [
    { title: "Keep the Patient Calm & Still", instruction: "Keep the patient seated or lying down comfortably. Loosen tight collar or clothing around neck." },
    { title: "Check Breathing & Responsiveness", instruction: "If unconscious and not breathing normally, begin continuous chest compressions (hands-only CPR)." },
    { title: "Do Not Give Food or Drink", instruction: "Never administer liquids or food to an unconscious or drowsy person to prevent choking." },
    { title: "Clear the Arrival Path", instruction: "Unlock outer gates, turn on porch lights, and have someone stand ready to flag down paramedics." },
  ],
  FLOOD: [
    { title: "Move to Higher Ground", instruction: "Move immediately to an upper floor, roof, or elevated ground. Avoid basements." },
    { title: "Disconnect Electrical Supply", instruction: "Switch off the main circuit breaker if you can safely reach it without standing in water." },
    { title: "Never Walk or Drive in Floodwaters", instruction: "Just 6 inches of moving water can sweep you off your feet, and 2 feet can carry away vehicles." },
    { title: "Boil Drinking Water", instruction: "Floodwaters contaminate tap lines. Only consume bottled or boiled water until cleared by officials." },
  ],
  BUILDING_COLLAPSE: [
    { title: "Cover Your Head & Torso", instruction: "Take shelter under a sturdy table or beside an interior wall. Protect your head and neck." },
    { title: "Avoid Elevators & Stairwells", instruction: "Stairwells and lifts may have compromised structural integrity. Use verified fire exits." },
    { title: "If Trapped, Tap on Pipes or Walls", instruction: "Avoid shouting to conserve oxygen and reduce dust inhalation; tap rhythmically on metal or pipes." },
    { title: "Cover Your Nose & Mouth", instruction: "Use a handkerchief or piece of cloth to filter concrete dust and pulverized debris." },
  ],
  OTHER: [
    { title: "Stay in a Secure Location", instruction: "Remain in a safe, visible area while emergency responders navigate to your coordinates." },
    { title: "Keep Phone Lines Open", instruction: "Keep your mobile battery conserved and available for incoming coordination calls." },
    { title: "Signal Responders", instruction: "Wave a bright cloth or shine a flashlight if in low light so responders can pinpoint you quickly." },
  ],
};

export function getSafetyTipsForCategory(category?: string | null): SafetyTip[] {
  if (!category) return SAFETY_TIPS.OTHER;
  const upper = category.toUpperCase();
  return SAFETY_TIPS[upper] || SAFETY_TIPS.OTHER;
}

