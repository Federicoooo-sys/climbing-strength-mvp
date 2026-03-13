import { WorkoutContext, useWorkoutReducer } from './hooks/useWorkout';
import { useTimer } from './hooks/useTimer';
import { useAudioCue } from './hooks/useAudioCue';
import { usePersistence } from './hooks/usePersistence';
import { useVisibilityPause } from './hooks/useVisibilityPause';
import { localStorageAdapter } from './storage/localStorage';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { CountdownScreen } from './screens/CountdownScreen';
import { ActiveScreen } from './screens/ActiveScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { RestScreen } from './screens/RestScreen';
import { EarlyStopScreen } from './screens/EarlyStopScreen';
import { CongratsScreen } from './screens/CongratsScreen';
import { SummaryScreen } from './screens/SummaryScreen';

function WorkoutApp() {
  const { state, dispatch, savedSession, storage } = useWorkoutReducer(localStorageAdapter);
  const playBeep = useAudioCue();

  useTimer(state, dispatch, playBeep);
  useVisibilityPause(state, dispatch);
  usePersistence(state, localStorageAdapter);

  const screenComponent = () => {
    switch (state.screen) {
      case 'welcome':   return <WelcomeScreen />;
      case 'countdown': return <CountdownScreen />;
      case 'active':    return <ActiveScreen />;
      case 'feedback':  return <FeedbackScreen />;
      case 'rest':      return <RestScreen />;
      case 'earlyStop': return <EarlyStopScreen />;
      case 'congrats':  return <CongratsScreen />;
      case 'summary':   return <SummaryScreen />;
    }
  };

  return (
    <WorkoutContext value={{ state, dispatch, savedSession, storage }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        {screenComponent()}
      </div>
    </WorkoutContext>
  );
}

export default function App() {
  return <WorkoutApp />;
}
