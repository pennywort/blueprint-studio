import { editorIcons } from '@presentation/icons/editor-icons';
import { IconStub } from '@presentation/features/attributes/icon-stub';
import type { ElementSketchProps } from './sketch-types';
import { useSketchStyles } from './sketch-styles';

// Набросок по умолчанию [owner 2026-11-19] — у всех видов без записи в таблице
// набросков: основной и дополнительный текст по card политики (заголовок,
// заголовок + подсказка, первичный + вторичный текст — выбирает card.subtitle).
// Иконка — только у вида с card.icon (выбранная или плейсхолдер, макет
// «пример-подсценариев-с-элементами»); контролы (флажок, рамка поля) не рисуются.
export function DefaultSketch({ title, secondaryText, icon, iconSlot }: ElementSketchProps) {
  const classes = useSketchStyles();
  return (
    <div className={classes.row}>
      {iconSlot ? (
        <div className={classes.iconWrap}>
          {icon ? <IconStub name={icon} /> : <editorIcons.elementPlaceholder fontSize="small" />}
        </div>
      ) : null}
      <div className={classes.texts}>
        <div className={classes.title}>{title}</div>
        {secondaryText ? <div className={classes.caption}>{secondaryText}</div> : null}
      </div>
    </div>
  );
}
