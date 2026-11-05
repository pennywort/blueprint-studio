import { editorIcons } from '@presentation/icons/editor-icons';
import { IconStub } from '@presentation/features/attributes/icon-stub';
import type { ElementSketchProps } from './sketch-types';
import { useSketchStyles } from './sketch-styles';

// Набросок по умолчанию [owner 2026-11-05] — для вида без записи в таблице
// набросков: иконка (card.icon политики или плейсхолдер) + основной и
// дополнительный текст по каталогу. Прежний вид карточки элемента (T-031).
export function DefaultSketch({ title, secondaryText, icon }: ElementSketchProps) {
  const classes = useSketchStyles();
  return (
    <div className={classes.row}>
      <div className={classes.iconWrap}>
        {icon ? <IconStub name={icon} /> : <editorIcons.elementPlaceholder fontSize="small" />}
      </div>
      <div className={classes.texts}>
        <div className={classes.title}>{title}</div>
        {secondaryText ? <div className={classes.caption}>{secondaryText}</div> : null}
      </div>
    </div>
  );
}
