# PipePatch damage taxonomy dataset

This offline dataset workflow supports annotation and evaluation of visual damage categories only. It does not authorize repairs, measure pipes, or certify safety. Any real field image requires informed consent, removal of identifying information, independent review, and storage outside Git unless explicitly approved. The initial manifest is synthetic only; class imbalance and field variation remain unresolved.

Use `backend/.venv/bin/python -c "from app.dataset import validate_manifest; print(validate_manifest('data/example-manifest.csv'))"` and evaluate recorded predictions with `from app.evaluation import evaluate`. Target metrics are future acceptance criteria, not achieved performance.
