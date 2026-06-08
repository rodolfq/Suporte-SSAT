const core = require('@dnd-kit/core');
const sortable = require('@dnd-kit/sortable');
const utils = require('@dnd-kit/utilities');

console.log('core:', !!core.DndContext, !!core.closestCenter, !!core.KeyboardSensor, !!core.PointerSensor, !!core.useSensor, !!core.useSensors);
console.log('sortable:', !!sortable.arrayMove, !!sortable.SortableContext, !!sortable.sortableKeyboardCoordinates, !!sortable.verticalListSortingStrategy, !!sortable.useSortable);
console.log('utils:', !!utils.CSS);